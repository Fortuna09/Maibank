-- Últimos pedidos feitos pela Siri: a frase exata que chegou e o que virou. Serve para a pessoa
-- (e quem dá suporte) ver quando a Siri transcreveu errado. Guardamos só os 15 mais recentes.
CREATE TABLE shortcut_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  heard       text NOT NULL,
  amount      numeric(12, 2),
  description text,
  ok          boolean NOT NULL,
  message     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shortcut_log_user_idx ON shortcut_log (user_id, created_at DESC);
