'use server';

import https from 'https';

interface ApiResponse {
  status: number;
  ok: boolean;
  data: unknown;
}

function sendRawRequest(path: string, method: string, body?: unknown): Promise<ApiResponse> {
  if (method !== 'GET') {
    return fetch(`https://urbaly.gabrielataide.com/v1/db${path}`, {
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
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = https.request(
      `https://urbaly.gabrielataide.com/v1/db${path}`,
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
  });
}

export interface ApiMapReport {
  id: number;
  titulo: string;
  descricao?: string;
  categoria: number;
  ponto: [number, number];
  data_criacao: string;
  data_atualizacao?: string;
  foto_nome?: string;
  foto_data?: string;
}

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

export async function createMapReport(input: {
  titulo: string;
  descricao: string;
  categoria: number;
  ponto: [number, number];
  fotoData?: string[];
}) {
  const fotoData = input.fotoData?.[0]?.replace(/^data:[^;]+;base64,/, '');
  const response = await sendRawRequest('/reporte', 'POST', {
    titulo: input.titulo,
    descricao: input.descricao,
    categoria: input.categoria,
    lon: input.ponto[0],
    lat: input.ponto[1],
    // The API requires a valid image payload even when the user skips photos.
    foto_data: fotoData || EMPTY_REPORT_IMAGE,
  });
  if (!response.ok) {
    throw new Error(
      typeof response.data === 'string'
        ? response.data
        : 'Não foi possível enviar o registro.'
    );
  }
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
