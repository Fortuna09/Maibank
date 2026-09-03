CREATE TABLE IF NOT EXISTS allocation_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  base_income DECIMAL(12, 2) NOT NULL DEFAULT 2700.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS allocation_buckets (
  id VARCHAR(50) PRIMARY KEY,
  label VARCHAR(120) NOT NULL,
  percentage DECIMAL(5, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id CHAR(36) PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  type VARCHAR(10) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  category VARCHAR(120) NOT NULL,
  transaction_date DATE NOT NULL,
  allocation_mode VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id CHAR(36) NOT NULL,
  bucket_id VARCHAR(50) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  CONSTRAINT fk_allocation_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  CONSTRAINT fk_allocation_bucket FOREIGN KEY (bucket_id) REFERENCES allocation_buckets(id)
);

CREATE TABLE IF NOT EXISTS goals (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  due_date DATE NULL,
  save_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  save_frequency VARCHAR(20) NOT NULL DEFAULT 'mensal',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goal_contributions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  goal_id CHAR(36) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  contribution_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contribution_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

INSERT INTO allocation_buckets (id, label, percentage)
VALUES
  ('reserva-emergencia', 'Reserva de emergencia', 37),
  ('uso-diario', 'Uso diario', 37),
  ('carro', 'Gastos com carro', 11),
  ('planos-futuros', 'Planos futuros', 15)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  percentage = VALUES(percentage);

INSERT INTO allocation_settings (base_income)
SELECT 2700.00
WHERE NOT EXISTS (SELECT 1 FROM allocation_settings);

CREATE TABLE IF NOT EXISTS salary_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  description VARCHAR(255) NOT NULL DEFAULT 'Salário automático',
  business_day INT NOT NULL DEFAULT 5,
  last_processed_month INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);