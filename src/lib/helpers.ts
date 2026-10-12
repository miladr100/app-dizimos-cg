export function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function blankEntry() {
  return {
    date: todayLocal(),
    name: '',
    reference: 'Dízimo 2026',
    amount: 0,
    category: 'Dízimo',
    payment: 'Pix',
  };
}

export type EntryForm = ReturnType<typeof blankEntry>;

export function fmtDate(s: string) {
  const p = s.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : s;
}

export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({ error: 'Resposta inválida do servidor.' }));
  if (!res.ok) throw new Error(data.error ?? 'Não foi possível concluir a solicitação.');
  return data as T;
}

export function message(err: unknown) {
  return err instanceof Error ? err.message : 'Erro inesperado.';
}
