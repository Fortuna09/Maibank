-- Mensagens do administrador para quem usa o app (aparecem num pop-up ao abrir).
-- Cada envio gera uma linha por destinatário — assim dá para saber quem leu — e todas
-- as linhas do mesmo envio compartilham o batch_id (o histórico do administrador agrupa por ele).
CREATE TABLE user_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id   uuid NOT NULL,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  sent_by    uuid REFERENCES users (id) ON DELETE SET NULL,
  to_all     boolean NOT NULL DEFAULT false,
  title      text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  body       text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at    timestamptz
);

CREATE INDEX user_messages_unread_idx ON user_messages (user_id, created_at) WHERE read_at IS NULL;
CREATE INDEX user_messages_batch_idx ON user_messages (batch_id);
