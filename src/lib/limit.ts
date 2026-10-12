// Limite básico por processo. Não equivale a um WAF distribuído/autenticação.
const hits = new Map<string, { count: number; until: number }>();

export function permit(request: Request, writes = false) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'global';
  const key = `${ip}:${writes ? 'write' : 'read'}`;
  const now = Date.now();
  const entry = hits.get(key);
  if (hits.size > 10000) {
    for (const [k, v] of hits) {
      if (v.until < now) hits.delete(k);
    }
  }
  const current = entry && entry.until > now ? entry : { count: 0, until: now + 60000 };
  current.count++;
  hits.set(key, current);
  return current.count <= (writes ? 35 : 120);
}
