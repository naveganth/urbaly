'use server';

import https from 'https';

// Low-level helper to allow GET requests with a JSON body in Node.js
function sendRawRequest(
  path: string,
  method: string,
  body?: Record<string, unknown>
): Promise<{ status: number; ok: boolean; data: unknown }> {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : undefined;

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
          let parsed: unknown = responseData;
          try {
            parsed = JSON.parse(responseData);
          } catch {
            // Keep as raw text if not valid JSON
          }
          resolve({
            status: res.statusCode || 500,
            ok: (res.statusCode || 500) >= 200 && (res.statusCode || 500) < 300,
            data: parsed,
          });
        });
      }
    );

    req.on('error', (err) => {
      resolve({ status: 500, ok: false, data: err.message });
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

// 1. Ping
export async function testPing() {
  return sendRawRequest('/ping', 'GET');
}

// 2. Quadro de Reportes
export async function testQuadroReportes() {
  return sendRawRequest('/reportes/quadro', 'GET', {
    lon1: -51.0,
    lat1: 3.0,
    lon2: -52.0,
    lat2: 2.0,
  });
}

// 3. Raio de Reportes
export async function testRaioReportes() {
  return sendRawRequest('/reportes/raio', 'GET', {
    lon1: -51.0,
    lat1: 3.0,
    lon2: -52.0,
    lat2: 2.0,
  });
}

// 4. Raio de Ponteiros
export async function testRaioPonteiros() {
  return sendRawRequest('/ponteiros/raio', 'GET', {
    lon: -53.0,
    lat: 2.1,
    raio: 10000,
  });
}

// 5. Quadro de Ponteiros
export async function testQuadroPonteiros() {
  return sendRawRequest('/ponteiros/quadro', 'GET', {
    lon1: -51.0,
    lat1: 3.0,
    lon2: -52.0,
    lat2: 2.0,
  });
}

// 6. Buscar Reporte
export async function testBuscarReporte() {
  return sendRawRequest('/reporte', 'GET', { id: 44384 });
}

// 7. Criar Reporte
export async function testCriarReporte() {
  return sendRawRequest('/reporte', 'POST', {
    titulo: 'teste API Next.js',
    categoria: 0,
    lon: -52.0,
    lat: 0.0,
    foto_data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  });
}

// 8. Atualizar Reporte
export async function testAtualizarReporte() {
  return sendRawRequest('/reporte', 'PUT', {
    id: 52196,
    descricao: 'Atualizado via Next.js',
    titulo: 'Novo Titulo Next.js',
  });
}

// 9. Deletar Reporte
export async function testDeletarReporte() {
  return sendRawRequest('/reporte', 'DELETE', { id: 52196 });
}