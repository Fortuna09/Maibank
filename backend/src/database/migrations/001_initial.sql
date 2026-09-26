-- Esquema inicial multiusuário (Postgres). Todo dado financeiro pertence a um usuário
-- e some junto com ele (ON DELETE CASCADE).

CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL UNIQUE,              -- sempre gravado em minúsculas
  name              text NOT NULL,
  password_hash     text NOT NULL,
  email_verified_at timestamptz,
  -- Incrementar derruba todas as sessões (troca de senha, "sair de todos os dispositivos").
  session_version   integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Links de confirmação de e-mail e de redefinição de senha. Guardamos só o hash do token.
CREATE TABLE auth_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  purpose    text NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_tokens_user_purpose_idx ON auth_tokens (user_id, purpose, created_at DESC);

-- Renda base usada nas prévias da distribuição.
CREATE TABLE allocation_settings (
  user_id     uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  base_income numeric(12, 2) NOT NULL DEFAULT 0
);

-- Divisões do dinheiro. O id é um slug ('uso-diario') único por usuário.
CREATE TABLE allocation_buckets (
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  id         text NOT NULL,
  label      text NOT NULL,
  percentage numeric(5, 2) NOT NULL,
  position   smallint NOT NULL DEFAULT 0,               -- ordem em que o usuário organizou
  PRIMARY KEY (user_id, id)
);

CREATE TABLE transactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  description      text NOT NULL,
  type             text NOT NULL CHECK (type IN ('entrada', 'saida', 'credito')),
  amount           numeric(12, 2) NOT NULL,
  category         text NOT NULL,
  transaction_date date NOT NULL,
  allocation_mode  text NOT NULL,
  installments     smallint NOT NULL DEFAULT 1,         -- só crédito usa mais de 1
  paid_invoice     char(7),                             -- 'AAAA-MM' da fatura que esta saída pagou
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transactions_user_date_idx ON transactions (user_id, transaction_date DESC, created_at DESC);

-- Quanto de cada lançamento foi para cada divisão. A FK composta garante que a divisão é do mesmo usuário.
-- Ela é checada só no fim da transação: ao apagar um usuário, divisões e alocações somem juntas
-- (checada na hora, a ordem do cascade faria a exclusão falhar). Apagar sozinha uma divisão
-- que tem lançamentos continua proibido.
CREATE TABLE transaction_allocations (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
  user_id        uuid NOT NULL,
  bucket_id      text NOT NULL,
  amount         numeric(12, 2) NOT NULL,
  FOREIGN KEY (user_id, bucket_id) REFERENCES allocation_buckets (user_id, id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX transaction_allocations_transaction_idx ON transaction_allocations (transaction_id);
CREATE INDEX transaction_allocations_bucket_idx ON transaction_allocations (user_id, bucket_id);

CREATE TABLE goals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title          text NOT NULL,
  target_amount  numeric(12, 2) NOT NULL,
  current_amount numeric(12, 2) NOT NULL DEFAULT 0,
  due_date       date,
  save_amount    numeric(12, 2) NOT NULL DEFAULT 0,
  save_frequency text NOT NULL DEFAULT 'mensal' CHECK (save_frequency IN ('mensal', 'semanal')),
  created_at     date NOT NULL DEFAULT current_date
);
CREATE INDEX goals_user_idx ON goals (user_id);

CREATE TABLE goal_contributions (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  goal_id           uuid NOT NULL REFERENCES goals (id) ON DELETE CASCADE,
  amount            numeric(12, 2) NOT NULL,
  contribution_date date NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX goal_contributions_goal_idx ON goal_contributions (goal_id);

-- Salário automático: uma entrada por mês, distribuída pelas divisões.
CREATE TABLE salary_config (
  user_id              uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  is_enabled           boolean NOT NULL DEFAULT false,
  amount               numeric(12, 2) NOT NULL DEFAULT 0,
  description          text NOT NULL DEFAULT 'Salário automático',
  pay_day              smallint NOT NULL DEFAULT 5 CHECK (pay_day BETWEEN 1 AND 28),
  last_processed_month integer NOT NULL DEFAULT 0      -- AAAAMM do último mês lançado
);

-- Cartão de crédito: as faturas são calculadas no front a partir dos lançamentos.
CREATE TABLE credit_config (
  user_id     uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  closing_day smallint NOT NULL DEFAULT 25 CHECK (closing_day BETWEEN 1 AND 28),
  due_day     smallint NOT NULL DEFAULT 5 CHECK (due_day BETWEEN 1 AND 28)
);
