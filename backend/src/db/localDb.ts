// ─────────────────────────────────────────────────────────────────────
// Banco LOCAL (Docker) — só para desenvolvimento e testes.
//
// Em produção (Vercel + Neon) nada daqui é usado: `localDatabaseUrl()` devolve
// null e as camadas de dados seguem com os drivers do Neon. Três travas:
//   1. process.env.VERCEL definido  → nunca usa banco local;
//   2. NODE_ENV === 'production'    → idem;
//   3. a URL precisa apontar para localhost/127.0.0.1/::1.
// Assim uma TEST_DATABASE_URL esquecida no painel da Vercel não desvia o
// tráfego, e uma URL remota nunca é tratada como "local".
// ─────────────────────────────────────────────────────────────────────
import { Pool } from 'pg';

export type Row = Record<string, any>;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function isLocalUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try { return LOCAL_HOSTS.has(new URL(url).hostname); } catch { return false; }
}

export function localDatabaseUrl(): string | null {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') return null;
  const url = process.env.V2_DATABASE_URL || process.env.TEST_DATABASE_URL;
  return url && isLocalUrl(url) ? url : null;
}

// ── `sql` tagged template compatível com o driver do Neon ──────────────
// O código legado usa sql`SELECT ... ${valor}` (com fragmentos aninhados,
// ex.: sql`, is_crisp`). O driver HTTP do Neon não fala com o Postgres do
// Docker, então localmente a mesma sintaxe roda em cima do `pg`.
export type Sql = (strings: TemplateStringsArray, ...values: any[]) => PromiseLike<Row[]>;

class LocalQuery implements PromiseLike<Row[]> {
  constructor(
    private readonly strings: readonly string[],
    private readonly values: readonly unknown[],
    private readonly pool: Pool,
  ) {}

  // Fragmentos aninhados são inlinados; o resto vira parâmetro $n.
  compile(params: unknown[]): string {
    let text = this.strings[0];
    this.values.forEach((v, i) => {
      if (v instanceof LocalQuery) {
        text += v.compile(params);
      } else {
        params.push(v);
        text += `$${params.length}`;
      }
      text += this.strings[i + 1];
    });
    return text;
  }

  then<R1 = Row[], R2 = never>(
    onfulfilled?: ((value: Row[]) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: any) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    const params: unknown[] = [];
    const text = this.compile(params);
    return this.pool.query(text, params).then((r) => r.rows as Row[]).then(onfulfilled, onrejected);
  }
}

export function createLocalSql(connectionString: string): Sql {
  const pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 30_000 });
  return (strings, ...values) => new LocalQuery(strings, values, pool);
}
