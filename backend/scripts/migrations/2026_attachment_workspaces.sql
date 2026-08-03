BEGIN;

ALTER TABLE anexos DROP CONSTRAINT IF EXISTS anexos_tipo_check;
ALTER TABLE anexos ADD CONSTRAINT anexos_tipo_check CHECK (tipo IN (
  'cover', 'documento', 'dado', 'codigo', 'notebook',
  'audio', 'video', 'imagem', 'anexo', 'avatar'
));

COMMIT;
