import cors from 'cors';
import express from 'express';
import { randomUUID } from 'crypto';
import { config } from './config.js';
import { pool, testDatabaseConnection } from './db.js';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await testDatabaseConnection();
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/settings', async (_req, res) => {
  try {
    const [settingsRows] = await pool.query(
      'SELECT id, base_income AS baseIncome FROM allocation_settings ORDER BY id ASC LIMIT 1'
    );

    const [bucketRows] = await pool.query(
      'SELECT id, label, percentage FROM allocation_buckets ORDER BY id ASC'
    );

    const settings = settingsRows[0] || { id: 1, baseIncome: 2700 };

    res.json({
      id: settings.id,
      baseIncome: Number(settings.baseIncome),
      buckets: bucketRows.map((bucket) => ({
        id: bucket.id,
        label: bucket.label,
        percentage: Number(bucket.percentage),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar configuracoes', detail: error.message });
  }
});

app.put('/api/settings', async (req, res) => {
  const { baseIncome, buckets } = req.body ?? {};

  if (!Array.isArray(buckets) || buckets.length === 0) {
    return res.status(400).json({ message: 'Buckets invalidos.' });
  }

  const totalPercentage = buckets.reduce((sum, bucket) => sum + Number(bucket.percentage || 0), 0);
  if (Math.round(totalPercentage) !== 100) {
    return res.status(400).json({ message: 'A soma dos percentuais precisa ser 100.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      'UPDATE allocation_settings SET base_income = ? WHERE id = (SELECT id FROM (SELECT id FROM allocation_settings ORDER BY id ASC LIMIT 1) AS t)',
      [Number(baseIncome || 0)]
    );

    for (const bucket of buckets) {
      await connection.query(
        'UPDATE allocation_buckets SET label = ?, percentage = ? WHERE id = ?',
        [String(bucket.label || ''), Number(bucket.percentage || 0), String(bucket.id)]
      );
    }

    await connection.commit();
    return res.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ message: 'Erro ao atualizar configuracoes', detail: error.message });
  } finally {
    connection.release();
  }
});

app.get('/api/transactions', async (_req, res) => {
  try {
    const [transactionRows] = await pool.query(
      'SELECT id, description, type, amount, category, transaction_date AS date, allocation_mode AS allocationMode FROM transactions ORDER BY transaction_date DESC, created_at DESC'
    );

    const [allocationRows] = await pool.query(
      'SELECT transaction_id AS transactionId, bucket_id AS bucketId, amount FROM transaction_allocations ORDER BY id ASC'
    );

    const allocationMap = new Map();
    for (const allocation of allocationRows) {
      const list = allocationMap.get(allocation.transactionId) ?? [];
      list.push({
        bucketId: allocation.bucketId,
        amount: Number(allocation.amount),
      });
      allocationMap.set(allocation.transactionId, list);
    }

    const transactions = transactionRows.map((transaction) => ({
      id: transaction.id,
      description: transaction.description,
      type: transaction.type,
      amount: Number(transaction.amount),
      category: transaction.category,
      date: transaction.date,
      allocationMode: transaction.allocationMode,
      allocations: allocationMap.get(transaction.id) ?? [],
    }));

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar transacoes', detail: error.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  const { description, type, amount, category, date, allocationMode, allocations } = req.body ?? {};

  if (!description || !type || !amount || !category || !date || !allocationMode || !Array.isArray(allocations) || allocations.length === 0) {
    return res.status(400).json({ message: 'Dados de transacao invalidos.' });
  }

  const id = randomUUID();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      'INSERT INTO transactions (id, description, type, amount, category, transaction_date, allocation_mode) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, description, type, Number(amount), category, date, allocationMode]
    );

    for (const allocation of allocations) {
      await connection.query(
        'INSERT INTO transaction_allocations (transaction_id, bucket_id, amount) VALUES (?, ?, ?)',
        [id, String(allocation.bucketId), Number(allocation.amount)]
      );
    }

    await connection.commit();
    return res.status(201).json({ id });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ message: 'Erro ao criar transacao', detail: error.message });
  } finally {
    connection.release();
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM transactions WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover transacao', detail: error.message });
  }
});

async function ensureGoalColumns() {
  const [columns] = await pool.query('SHOW COLUMNS FROM goals');
  const existing = new Set(columns.map((column) => column.Field));
  const dueDateColumn = columns.find((column) => column.Field === 'due_date');

  if (dueDateColumn && dueDateColumn.Null !== 'YES') {
    await pool.query('ALTER TABLE goals MODIFY COLUMN due_date DATE NULL');
  }

  const columnDefinitions = [
    ['save_amount', 'DECIMAL(12,2) NOT NULL DEFAULT 0'],
    ['save_frequency', 'VARCHAR(20) NOT NULL DEFAULT "mensal"'],
  ];

  for (const [name, definition] of columnDefinitions) {
    if (!existing.has(name)) {
      await pool.query(`ALTER TABLE goals ADD COLUMN ${name} ${definition}`);
    }
  }
}

app.get('/api/goals', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, title, target_amount AS targetAmount, current_amount AS currentAmount, due_date AS dueDate, save_amount AS saveAmount, save_frequency AS saveFrequency, created_at AS createdAt FROM goals ORDER BY due_date ASC, created_at DESC'
    );

    res.json(
      rows.map((goal) => ({
        id: goal.id,
        title: goal.title,
        targetAmount: Number(goal.targetAmount),
        currentAmount: Number(goal.currentAmount),
        dueDate: goal.dueDate,
        saveAmount: Number(goal.saveAmount ?? 0),
        saveFrequency: goal.saveFrequency ?? 'mensal',
        createdAt: goal.createdAt,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar metas', detail: error.message });
  }
});

app.post('/api/goals', async (req, res) => {
  const { title, targetAmount, currentAmount, dueDate, saveAmount, saveFrequency, createdAt } = req.body ?? {};
  if (!title || targetAmount == null || currentAmount == null || saveAmount == null || !saveFrequency) {
    return res.status(400).json({ message: 'Dados da meta invalidos.' });
  }

  const id = randomUUID();
  try {
    await pool.query(
      'INSERT INTO goals (id, title, target_amount, current_amount, due_date, save_amount, save_frequency, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, Number(targetAmount), Number(currentAmount ?? 0), dueDate || null, Number(saveAmount), saveFrequency, createdAt ?? new Date().toISOString().slice(0, 10)]
    );

    res.status(201).json({ id });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar meta', detail: error.message });
  }
});

app.put('/api/goals/:id', async (req, res) => {
  const { id } = req.params;
  const { title, targetAmount, currentAmount, dueDate, saveAmount, saveFrequency, createdAt } = req.body ?? {};

  if (!title || targetAmount == null || currentAmount == null || saveAmount == null || !saveFrequency) {
    return res.status(400).json({ message: 'Dados da meta invalidos.' });
  }

  try {
    await pool.query(
      'UPDATE goals SET title = ?, target_amount = ?, current_amount = ?, due_date = ?, save_amount = ?, save_frequency = ?, created_at = ? WHERE id = ?',
      [title, Number(targetAmount), Number(currentAmount ?? 0), dueDate || null, Number(saveAmount), saveFrequency, createdAt ?? new Date().toISOString().slice(0, 10), id]
    );

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar meta', detail: error.message });
  }
});

app.post('/api/goals/:id/contributions', async (req, res) => {
  const { id } = req.params;
  const amount = Number(req.body?.amount);
  const contributionDate = req.body?.date || new Date().toISOString().slice(0, 10);

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: 'O valor da contribuição deve ser maior que zero.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [goalRows] = await connection.query('SELECT id FROM goals WHERE id = ? FOR UPDATE', [id]);
    if (goalRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Meta não encontrada.' });
    }

    await connection.query(
      'INSERT INTO goal_contributions (goal_id, amount, contribution_date) VALUES (?, ?, ?)',
      [id, amount, contributionDate]
    );
    await connection.query('UPDATE goals SET current_amount = current_amount + ? WHERE id = ?', [amount, id]);
    await connection.commit();
    res.status(201).json({ ok: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Erro ao adicionar valor à meta', detail: error.message });
  } finally {
    connection.release();
  }
});

app.delete('/api/goals/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM goals WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover meta', detail: error.message });
  }
});

async function ensureSalaryConfigTable() {
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS salary_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        description VARCHAR(255) NOT NULL DEFAULT 'Salário automático',
        business_day INT NOT NULL DEFAULT 5,
        last_processed_month INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`
    );

    const [rows] = await pool.query('SELECT COUNT(*) as count FROM salary_config');
    if (rows[0].count === 0) {
      await pool.query(
        'INSERT INTO salary_config (is_enabled, amount, description, business_day, last_processed_month) VALUES (?, ?, ?, ?, ?)',
        [false, 0, 'Salário automático', 5, 0]
      );
    }
  } catch (error) {
    console.error('Erro ao garantir tabela salary_config:', error);
  }
}

function getBusinessDayOfMonth(year, month, businessDay) {
  const firstDay = new Date(year, month - 1, 1);
  let count = 0;
  let currentDate = new Date(firstDay);

  while (count < businessDay) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      count++;
    }
    if (count < businessDay) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return currentDate;
}

app.get('/api/salary-config', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM salary_config LIMIT 1');
    const config = rows[0] || {
      id: 1,
      isEnabled: false,
      amount: 0,
      description: 'Salário automático',
      businessDay: 5,
      lastProcessedMonth: 0,
    };

    res.json({
      id: config.id,
      isEnabled: config.is_enabled,
      amount: Number(config.amount),
      description: config.description,
      businessDay: config.business_day,
      lastProcessedMonth: config.last_processed_month,
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar configuração de salário', detail: error.message });
  }
});

app.put('/api/salary-config', async (req, res) => {
  const { isEnabled, amount, description, businessDay } = req.body ?? {};

  try {
    await pool.query(
      'UPDATE salary_config SET is_enabled = ?, amount = ?, description = ?, business_day = ? WHERE id = 1',
      [Boolean(isEnabled), Number(amount), String(description), Number(businessDay)]
    );
    return res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar configuração de salário', detail: error.message });
  }
});

app.post('/api/salary-config/process', async (req, res) => {
  try {
    const [configRows] = await pool.query('SELECT * FROM salary_config LIMIT 1');
    const config = configRows[0];

    if (!config || !config.is_enabled) {
      return res.status(400).json({ message: 'Salário automático não ativado' });
    }

    const today = new Date();
    const currentMonth = today.getFullYear() * 100 + (today.getMonth() + 1);

    if (config.last_processed_month === currentMonth) {
      return res.status(400).json({ message: 'Salário já processado este mês' });
    }

    const businessDayDate = getBusinessDayOfMonth(today.getFullYear(), today.getMonth() + 1, config.business_day);

    if (today < businessDayDate) {
      return res.status(400).json({ message: 'Ainda não é a data de processamento' });
    }

    const [settingsRows] = await pool.query('SELECT id FROM allocation_settings LIMIT 1');
    const settings = settingsRows[0] || { id: 1 };

    const [bucketRows] = await pool.query('SELECT id FROM allocation_buckets');
    if (bucketRows.length === 0) {
      return res.status(400).json({ message: 'Nenhuma divisão configurada' });
    }

    const { randomUUID } = await import('crypto');
    const id = randomUUID();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        'INSERT INTO transactions (id, description, type, amount, category, transaction_date, allocation_mode) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          config.description,
          'entrada',
          Number(config.amount),
          'salário',
          today.toISOString().slice(0, 10),
          'percentual',
        ]
      );

      const [allocationRows] = await connection.query(
        'SELECT id, percentage FROM allocation_buckets ORDER BY id ASC'
      );

      let totalAllocated = 0;
      for (let i = 0; i < allocationRows.length; i++) {
        const bucket = allocationRows[i];
        const isLast = i === allocationRows.length - 1;
        let allocatedAmount;

        if (isLast) {
          allocatedAmount = Number(config.amount) - totalAllocated;
        } else {
          allocatedAmount = Math.round(
            ((Number(config.amount) * Number(bucket.percentage)) / 100) * 100
          ) / 100;
        }

        await connection.query(
          'INSERT INTO transaction_allocations (transaction_id, bucket_id, amount) VALUES (?, ?, ?)',
          [id, String(bucket.id), allocatedAmount]
        );

        totalAllocated += allocatedAmount;
      }

      await connection.query('UPDATE salary_config SET last_processed_month = ? WHERE id = 1', [currentMonth]);

      await connection.commit();
      return res.status(201).json({ id });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao processar salário automático', detail: error.message });
  }
});

await ensureGoalColumns();
await ensureSalaryConfigTable();
await pool.query(`CREATE TABLE IF NOT EXISTS goal_contributions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  goal_id CHAR(36) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  contribution_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contribution_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
)`);

app.listen(config.port, () => {
  console.log(`Maibank backend running at http://localhost:${config.port}`);
});
