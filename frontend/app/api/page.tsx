'use client';

import { useState } from 'react';
import * as api from '@/app/actions/api';

export default function ApiTestPage() {
  const [response, setResponse] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async (name: string, action: () => Promise<unknown>) => {
    setLoading(true);
    setResponse(`Testing: ${name}...`);
    try {
      const data = await action();
      setResponse(data);
    } catch (err: unknown) {
      setResponse({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>API Test Page (Server Actions)</h1>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button disabled={loading} onClick={() => runTest('Ping', api.testPing)}>
          1. Ping
        </button>
        <button disabled={loading} onClick={() => runTest('Quadro Reportes', api.testQuadroReportes)}>
          2. Quadro Reportes
        </button>
        <button disabled={loading} onClick={() => runTest('Raio Reportes', api.testRaioReportes)}>
          3. Raio Reportes
        </button>
        <button disabled={loading} onClick={() => runTest('Raio Ponteiros', api.testRaioPonteiros)}>
          4. Raio Ponteiros
        </button>
        <button disabled={loading} onClick={() => runTest('Quadro Ponteiros', api.testQuadroPonteiros)}>
          5. Quadro Ponteiros
        </button>
        <button disabled={loading} onClick={() => runTest('Buscar Reporte', api.testBuscarReporte)}>
          6. Buscar Reporte
        </button>
        <button disabled={loading} onClick={() => runTest('Criar Reporte', api.testCriarReporte)}>
          7. Criar Reporte
        </button>
        <button disabled={loading} onClick={() => runTest('Atualizar Reporte', api.testAtualizarReporte)}>
          8. Atualizar Reporte
        </button>
        <button disabled={loading} onClick={() => runTest('Deletar Reporte', api.testDeletarReporte)}>
          9. Deletar Reporte
        </button>
      </div>

      <h2>API Response:</h2>
      <pre
        style={{
          background: '#f4f4f4',
          padding: '1rem',
          borderRadius: '5px',
          overflowX: 'auto',
          minHeight: '100px',
        }}
      >
        {JSON.stringify(response, null, 2)}
      </pre>
    </div>
  );
}