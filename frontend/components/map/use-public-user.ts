'use client';

import * as React from 'react';
import { getUsuarioPublico } from '@/app/actions/auth';
import { extractUser, type UrbalyUser } from '@/lib/auth';

type PublicUserState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; user: UrbalyUser }
  | { status: 'error' };

/** Cache em memória + deduplicação de requisições em voo por id. */
const cache = new Map<number, UrbalyUser | null>();
const inflight = new Map<number, Promise<UrbalyUser | null>>();

function fetchPublicUser(id: number): Promise<UrbalyUser | null> {
  if (cache.has(id)) return Promise.resolve(cache.get(id) ?? null);
  const ongoing = inflight.get(id);
  if (ongoing) return ongoing;
  const request = getUsuarioPublico(id)
    .then((result) => {
      const user = result.ok ? extractUser(result.data) : null;
      cache.set(id, user);
      return user;
    })
    .catch(() => {
      cache.set(id, null);
      return null;
    })
    .finally(() => {
      inflight.delete(id);
    });
  inflight.set(id, request);
  return request;
}

/**
 * Busca os dados públicos do autor (`GET /v1/auth/usuario { id }`).
 * `undefined`/0 = reporte anônimo/legado: não busca nada.
 * O painel pai remonta por `key={report.id}`, então o `id` é constante por
 * montagem e o estado inicial lazy já reflete o estado de carregamento.
 */
export function usePublicUser(id: number | undefined): PublicUserState {
  const [state, setState] = React.useState<PublicUserState>(() =>
    typeof id === 'number' && id > 0 ? { status: 'loading' } : { status: 'idle' },
  );

  React.useEffect(() => {
    if (typeof id !== 'number' || id <= 0) return;
    let cancelled = false;
    fetchPublicUser(id).then((user) => {
      if (cancelled) return;
      setState(user ? { status: 'loaded', user } : { status: 'error' });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}

/** Limpa o cache (útil em testes e após troca de conta). */
export function clearPublicUserCache(): void {
  cache.clear();
  inflight.clear();
}
