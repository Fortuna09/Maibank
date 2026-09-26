-- Lançamentos recorrentes: modelos que geram uma entrada ou saída por mês (assinaturas,
-- aluguel, rendas fixas). Cada ocorrência gerada é um lançamento comum, ligado ao modelo.

CREATE TABLE recurring_transactions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  description          text NOT NULL,
  type                 text NOT NULL CHECK (type IN ('entrada', 'saida')),
  amount               numeric(12, 2) NOT NULL CHECK (amount > 0),
  category             text NOT NULL,
  allocation_mode      text NOT NULL CHECK (allocation_mode IN ('especifico', 'percentual')),
  bucket_id            text,                             -- só no modo 'especifico'
  day_of_month         smallint NOT NULL CHECK (day_of_month BETWEEN 1 AND 28),
  last_generated_month integer NOT NULL,                 -- AAAAMM da última ocorrência lançada
  created_at           timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id, bucket_id) REFERENCES allocation_buckets (user_id, id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX recurring_transactions_user_idx ON recurring_transactions (user_id);

-- Parar a recorrência não apaga o que já foi lançado: as ocorrências só perdem o vínculo.
ALTER TABLE transactions
  ADD COLUMN recurring_id uuid REFERENCES recurring_transactions (id) ON DELETE SET NULL;
