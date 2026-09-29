import type { Request } from 'express';

// Campos que os middlewares de auth penduram no Request do Express.
// Fica num módulo (não num .d.ts solto) de propósito: o build da Vercel só
// compila o que é alcançável a partir da entrada, e um .d.ts ambiente não
// importado por ninguém ficaria de fora (erro: Property 'auth' does not exist).
declare global {
  namespace Express {
    interface AuthInfo {
      id: number;
      tipo: 'user' | 'admin';
      role: string;
    }
    interface Request {
      /**
       * Auth v2 (authV2.ts): sessão validada. Sob `optionalAuth` vale null p/
       * anônimo — nessas rotas leia com `req.auth?.`.
       */
      auth: AuthInfo;
      /** Legado (verifyToken): payload do JWT antigo. */
      user?: any;
    }
  }
}

/**
 * Request "solto": params/query/body como `any`. As rotas validam a entrada com
 * zod (ou checagem manual) logo na entrada, então o tipo estreito do Express
 * (`string | string[] | ParsedQs...`) só geraria casts sem valor.
 */
export type Req = Request<any, any, any, any>;
