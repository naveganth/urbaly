'use server';

import http from 'http';
import https from 'https';

interface AuthResponse {
  ok: boolean;
  status: number;
  data: unknown;
  error?: string;
}

const PRIMARY_AUTH_BASE_URL =
  process.env.AUTH_BASE_URL ||
  process.env.NEXT_PUBLIC_AUTH_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace('/v1/db', '/v1/auth') ||
  process.env.API_BASE_URL?.replace('/v1/db', '/v1/auth') ||
  'http://localhost:8080/v1/auth';
const FALLBACK_AUTH_BASE_URL = 'https://urbaly.gabrielataide.com/v1/auth';

function extractErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === 'string' && data.trim().length > 0) return data;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['error', 'message', 'detail', 'msg', 'erro']) {
      const value = obj[key];
      if (typeof value === 'string' && value.trim().length > 0) return value;
    }
    try {
      const raw = JSON.stringify(data).slice(0, 500);
      if (raw && raw !== '{}' && raw !== '[]' && raw !== '""') return raw;
    } catch {
      // Usa a mensagem genérica abaixo.
    }
  }
  return fallback;
}

async function executeAuthRequest(
  baseUrl: string,
  path: string,
  method: string,
  body?: unknown,
  jwt?: string,
): Promise<AuthResponse> {
  const urlString = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
  };

  if (method !== 'GET') {
    return fetch(urlString, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
      .then(async (res) => {
        const responseText = await res.text();
        let data: unknown = responseText;
        try {
          data = JSON.parse(responseText);
        } catch {
          // Alguns endpoints retornam texto puro.
        }
        return { status: res.status, ok: res.ok, data };
      })
      .catch((error: unknown) => ({
        status: 500,
        ok: false,
        data: error instanceof Error ? error.message : 'Erro de rede.',
      }));
  }

  // GET com body (ex.: /usuario pede { "id": 1 }): fetch descartaria o corpo,
  // então usa http/https nativo igual às actions de /db.
  return new Promise((resolve) => {
    try {
      const payload = body === undefined ? undefined : JSON.stringify(body);
      const parsedUrl = new URL(urlString);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const req = client.request(
        urlString,
        {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
            ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          },
        },
        (res) => {
          let responseData = '';
          res.on('data', (chunk) => (responseData += chunk));
          res.on('end', () => {
            let data: unknown = responseData;
            try {
              data = JSON.parse(responseData);
            } catch {
              // Resposta em texto puro.
            }
            const status = res.statusCode || 500;
            resolve({ status, ok: status >= 200 && status < 300, data });
          });
        },
      );

      req.on('error', (error) => resolve({ status: 500, ok: false, data: error.message }));
      if (payload) req.write(payload);
      req.end();
    } catch (error: unknown) {
      resolve({
        status: 500,
        ok: false,
        data: error instanceof Error ? error.message : 'Erro ao inicializar requisição.',
      });
    }
  });
}

function isConnectionError(data: unknown): boolean {
  if (typeof data !== 'string') return false;
  return (
    data.includes('ECONNREFUSED') ||
    data.includes('fetch failed') ||
    data.includes('ENOTFOUND') ||
    data.includes('EAI_AGAIN')
  );
}

async function sendAuthRequest(
  path: string,
  method: string,
  body?: unknown,
  jwt?: string,
): Promise<AuthResponse> {
  const primary = await executeAuthRequest(PRIMARY_AUTH_BASE_URL, path, method, body, jwt);
  if (
    !primary.ok &&
    PRIMARY_AUTH_BASE_URL !== FALLBACK_AUTH_BASE_URL &&
    (primary.status === 500 || isConnectionError(primary.data))
  ) {
    return executeAuthRequest(FALLBACK_AUTH_BASE_URL, path, method, body, jwt);
  }
  return primary;
}

/**
 * Troca o ID Token do Google pelo JWT do Urbaly.
 * Equivale a: POST /v1/auth/google { "token_google": "<ID_TOKEN>" }
 */
export async function authWithGoogle(tokenGoogle: string): Promise<AuthResponse> {
  if (!tokenGoogle || !tokenGoogle.trim()) {
    return { ok: false, status: 400, data: null, error: 'Token do Google ausente.' };
  }
  const response = await sendAuthRequest('/google', 'POST', { token_google: tokenGoogle });
  if (!response.ok) {
    return {
      ...response,
      error: extractErrorMessage(response.data, 'Não foi possível autenticar com o Google.'),
    };
  }
  return response;
}

/**
 * Valida o JWT do Urbaly, retornando o usuário.
 * Equivale a: GET /v1/auth/validar Authorization: Bearer <JWT>
 */
export async function validarJwt(jwt: string): Promise<AuthResponse> {
  if (!jwt || !jwt.trim()) {
    return { ok: false, status: 401, data: null, error: 'Sessão ausente. Entre novamente.' };
  }
  const response = await sendAuthRequest('/validar', 'GET', undefined, jwt);
  if (!response.ok) {
    return {
      ...response,
      error: extractErrorMessage(response.data, 'Sessão inválida ou expirada.'),
    };
  }
  return response;
}

/** Informações públicas de um usuário: GET /v1/auth/usuario { "id": N } */
export async function getUsuarioPublico(id: number): Promise<AuthResponse> {
  if (!Number.isInteger(id)) {
    return { ok: false, status: 400, data: null, error: 'ID de usuário inválido.' };
  }
  const response = await sendAuthRequest('/usuario', 'GET', { id });
  if (!response.ok) {
    return {
      ...response,
      error: extractErrorMessage(response.data, 'Não foi possível carregar o usuário.'),
    };
  }
  return response;
}
