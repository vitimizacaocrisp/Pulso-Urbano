# Limite rígido de tamanho de upload no R2

## Contexto

O backend valida o tamanho do arquivo (`MAX_UPLOAD_BYTES`, 50 MB) ao gerar a URL
assinada, em `src/middleware/s3Connection.js`. Isso é **advisory**: o servidor não
emite URL para um arquivo declarado como grande, o que cobre uso normal e acidental.

Porém, como o upload usa **presigned PUT** direto do navegador para o R2, um cliente
malicioso que já possua uma URL assinada pode enviar mais bytes do que declarou — o
R2, via presigned PUT, não impõe `Content-Length` de forma confiável.

Para um limite **rígido**, coloque um Cloudflare Worker na frente do bucket.

## Passo a passo (Cloudflare Worker)

1. **Crie um Worker** no painel Cloudflare (Workers & Pages → Create Worker).

2. **Vincule o bucket R2** ao Worker (Settings → Variables → R2 Bucket Bindings),
   ex.: binding `BUCKET` → seu bucket.

3. **Código do Worker** (rejeita uploads acima do limite e repassa o resto):

   ```js
   const MAX_BYTES = 50 * 1024 * 1024; // mantenha igual ao MAX_UPLOAD_BYTES do backend

   export default {
     async fetch(request, env) {
       if (request.method === 'PUT') {
         const len = Number(request.headers.get('content-length') || 0);
         if (!len || len > MAX_BYTES) {
           return new Response('Arquivo excede o limite permitido.', { status: 413 });
         }
         const key = new URL(request.url).pathname.slice(1);
         await env.BUCKET.put(key, request.body, {
           httpMetadata: { contentType: request.headers.get('content-type') || undefined },
         });
         return new Response('OK', { status: 200 });
       }
       return new Response('Método não permitido', { status: 405 });
     },
   };
   ```

4. **Aponte os uploads para o Worker**: troque o domínio das URLs de upload para a
   rota do Worker (ou coloque o Worker em rota que intercepte o endpoint de upload).
   O `Content-Length` é enviado automaticamente pelo navegador, então o Worker o vê
   de forma confiável — diferente do presigned PUT direto.

5. **Mantenha o `MAX_BYTES` do Worker sincronizado** com `MAX_UPLOAD_BYTES` do backend.

## Alternativa

Se preferir não usar Worker, configure limites/alertas de uso no painel do R2 e
monitore o crescimento do bucket. Não impede o abuso pontual, mas reduz o risco de
custo descontrolado.
