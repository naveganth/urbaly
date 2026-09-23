'use server';

import http from 'http';
import https from 'https';

interface ApiResponse {
  status: number;
  ok: boolean;
  data: unknown;
}

const PRIMARY_API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080/v1/db';
const FALLBACK_API_BASE_URL = 'https://urbaly.gabrielataide.com/v1/db';
const REPORT_IMAGE_CDN = 'https://urbalycdn.gabrielataide.com';

async function executeRawRequest(
  baseUrl: string,
  path: string,
  method: string,
  body?: unknown
): Promise<ApiResponse> {
  const urlString = `${baseUrl}${path}`;

  if (method !== 'GET') {
    return fetch(urlString, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
      .then(async (res) => {
        const responseText = await res.text();
        let data: unknown = responseText;
        try {
          data = JSON.parse(responseText);
        } catch {
          // Some endpoints return plain-text success/error messages.
        }
        return { status: res.status, ok: res.ok, data };
      })
      .catch((error: unknown) => ({
        status: 500,
        ok: false,
        data: error instanceof Error ? error.message : 'Erro de rede.',
      }));
  }

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
              // Some endpoints return plain-text success/error messages.
            }
            const status = res.statusCode || 500;
            resolve({ status, ok: status >= 200 && status < 300, data });
          });
        }
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

async function sendRawRequest(path: string, method: string, body?: unknown): Promise<ApiResponse> {
  const primaryResult = await executeRawRequest(PRIMARY_API_BASE_URL, path, method, body);
  if (
    !primaryResult.ok &&
    PRIMARY_API_BASE_URL !== FALLBACK_API_BASE_URL &&
    (primaryResult.status === 500 || isConnectionError(primaryResult.data))
  ) {
    return executeRawRequest(FALLBACK_API_BASE_URL, path, method, body);
  }
  return primaryResult;
}

export type ApiMapReport = {
  id: number;
  titulo: string;
  descricao?: string;
  categoria: number;
  ponto: [number, number];
  data_criacao: string;
  data_atualizacao?: string;
  foto_nome?: string;
  foto_data?: string;
};

interface ApiMapReportsResponse {
  qtd: number;
  reportes: ApiMapReport[];
}

const MACAPA_BOUNDS: [number, number, number, number] = [-51.2, -0.1, -50.9, 0.2];
const EMPTY_REPORT_IMAGE =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function isMapReportsResponse(data: unknown): data is ApiMapReportsResponse {
  if (!data || typeof data !== 'object') return false;
  const response = data as Partial<ApiMapReportsResponse>;
  return (
    Array.isArray(response.reportes) &&
    response.reportes.every(
      (report) =>
        report &&
        typeof report === 'object' &&
        typeof report.id === 'number' &&
        typeof report.titulo === 'string' &&
        Array.isArray(report.ponto) &&
        report.ponto.length === 2 &&
        (report.foto_nome === undefined || typeof report.foto_nome === 'string') &&
        (report.foto_data === undefined || typeof report.foto_data === 'string')
    )
  );
}

function normalizeImageUrl(source: string): string {
  if (!source) return '';
  const trimmed = source.trim();
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  if (
    trimmed.length > 50 &&
    /^[A-Za-z0-9+/=]+$/.test(trimmed.slice(0, 100)) &&
    !trimmed.includes(' ')
  ) {
    return `data:image/jpeg;base64,${trimmed}`;
  }
  return `${REPORT_IMAGE_CDN}/${encodeURIComponent(trimmed)}`;
}

export async function getMapReports(): Promise<ApiMapReport[]> {
  const response = await sendRawRequest('/reportes/quadro', 'GET', MACAPA_BOUNDS);
  if (!response.ok) {
    throw new Error(
      typeof response.data === 'string'
        ? response.data
        : 'Não foi possível carregar os registros do mapa.'
    );
  }
  if (!isMapReportsResponse(response.data)) {
    throw new Error('A API retornou um formato de registros inválido.');
  }
  return response.data.reportes;
}

/**
 * Server Action to fetch images for a specific report ID:
 * Matches: curl -X GET -H "Content-Type: application/json" http://localhost:8080/v1/db/reporte/imagens -d '{ "id": 52262 }'
 */
export async function getReportImages(id: number | string): Promise<string[]> {
  const numericId = typeof id === 'number' ? id : parseInt(id, 10);
  if (isNaN(numericId)) return [];

  const response = await sendRawRequest('/reporte/imagens', 'GET', { id: numericId });
  if (!response.ok || !response.data) {
    return [];
  }

  const data = response.data;

  // 1. Array response
  if (Array.isArray(data)) {
    return data
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => normalizeImageUrl(item));
  }

  // 2. Object response wrapping images
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    const imgList = Array.isArray(obj.imagens)
      ? obj.imagens
      : Array.isArray(obj.fotos)
        ? obj.fotos
        : Array.isArray(obj.images)
          ? obj.images
          : null;

    if (imgList) {
      return imgList
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => normalizeImageUrl(item));
    }

    if (typeof obj.foto_data === 'string' && obj.foto_data.trim().length > 0) {
      return [normalizeImageUrl(obj.foto_data)];
    }

    if (typeof obj.foto_nome === 'string' && obj.foto_nome.trim().length > 0) {
      return [normalizeImageUrl(obj.foto_nome)];
    }
  }

  // 3. String response (single base64 or URL)
  if (typeof data === 'string' && data.trim().length > 30) {
    return [normalizeImageUrl(data)];
  }

  return [];
}

export async function createMapReport(input: {
  titulo: string;
  descricao: string;
  categoria: number;
  ponto: [number, number];
  fotoData?: string[];
}): Promise<{ id?: number }> {
  const fotoData = input.fotoData?.[0]?.replace(/^data:[^;]+;base64,/, '');
  const response = await sendRawRequest('/reporte', 'POST', {
    titulo: input.titulo,
    descricao: input.descricao,
    categoria: input.categoria,
    lon: input.ponto[0],
    lat: input.ponto[1],
    foto_data: fotoData || EMPTY_REPORT_IMAGE,
  });
  if (!response.ok) {
    throw new Error(
      typeof response.data === 'string'
        ? response.data
        : 'Não foi possível enviar o registro.'
    );
  }

  if (typeof response.data === 'object' && response.data !== null && 'id' in response.data) {
    return { id: Number((response.data as { id: unknown }).id) };
  }
  return {};
}

export async function testPing() {
  return sendRawRequest('/ping', 'GET');
}

export async function testQuadroReportes() {
  return sendRawRequest('/reportes/quadro', 'GET', MACAPA_BOUNDS);
}

export async function testRaioReportes() {
  return sendRawRequest('/reportes/raio', 'GET', MACAPA_BOUNDS);
}

export async function testRaioPonteiros() {
  return sendRawRequest('/ponteiros/raio', 'GET', {
    lon: -53.0,
    lat: 2.1,
    raio: 10000,
  });
}

export async function testQuadroPonteiros() {
  return sendRawRequest('/ponteiros/quadro', 'GET', MACAPA_BOUNDS);
}

export async function testBuscarReporte() {
  return sendRawRequest('/reporte', 'GET', [52209]);
}

export async function testCriarReporte() {
  return sendRawRequest('/reporte', 'POST', {
    titulo: 'teste API Next.js',
    categoria: 0,
    lon: -52.0,
    lat: 0.0,
    foto_data:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  });
}

export async function testAtualizarReporte() {
  return sendRawRequest('/reporte', 'PUT', {
    id: 52196,
    descricao: 'Atualizado via Next.js',
    titulo: 'Novo Titulo Next.js',
  });
}

export async function testDeletarReporte() {
  return sendRawRequest('/reporte', 'DELETE', { id: 52196 });
}
