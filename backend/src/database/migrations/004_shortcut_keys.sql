-- Chave pessoal para o atalho da Siri (app Atalhos do iPhone) lançar gastos sem abrir o app.
-- Uma por pessoa. Só o hash fica guardado: a chave aparece uma vez, quando é criada;
-- gerar outra invalida a anterior. key_hint = últimos caracteres, para a pessoa reconhecer.
CREATE TABLE shortcut_keys (
  user_id      uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  key_hash     text NOT NULL UNIQUE,
  key_hint     text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
