import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { testDatabaseConnection } from './db.js';
import { errorHandler } from './http/errorHandler.js';
import { CreditController } from './modules/credit/CreditController.js';
import { CreditRepository } from './modules/credit/CreditRepository.js';
import { CreditService } from './modules/credit/CreditService.js';
import { GoalsController } from './modules/goals/GoalsController.js';
import { GoalsRepository } from './modules/goals/GoalsRepository.js';
import { GoalsService } from './modules/goals/GoalsService.js';
import { SalaryController } from './modules/salary/SalaryController.js';
import { SalaryRepository } from './modules/salary/SalaryRepository.js';
import { SalaryService } from './modules/salary/SalaryService.js';
import { SettingsController } from './modules/settings/SettingsController.js';
import { SettingsRepository } from './modules/settings/SettingsRepository.js';
import { SettingsService } from './modules/settings/SettingsService.js';
import { TransactionsController } from './modules/transactions/TransactionsController.js';
import { TransactionsRepository } from './modules/transactions/TransactionsRepository.js';
import { TransactionsService } from './modules/transactions/TransactionsService.js';

/**
 * Monta o Express e liga os módulos. Cada módulo é Repository (SQL) →
 * Service (regras) → Controller (rotas); aqui é o único lugar que os conecta.
 */
export function createApp() {
  const settingsRepository = new SettingsRepository();
  const transactionsRepository = new TransactionsRepository();
  const goalsRepository = new GoalsRepository();
  const salaryRepository = new SalaryRepository();
  const creditRepository = new CreditRepository();

  const settings = new SettingsController(new SettingsService(settingsRepository));
  const transactions = new TransactionsController(new TransactionsService(transactionsRepository));
  const goals = new GoalsController(new GoalsService(goalsRepository));
  const salary = new SalaryController(new SalaryService(salaryRepository, settingsRepository, transactionsRepository));
  const credit = new CreditController(new CreditService(creditRepository));

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

  app.use('/api/settings', settings.router);
  app.use('/api/transactions', transactions.router);
  app.use('/api/goals', goals.router);
  app.use('/api/salary-config', salary.router);
  app.use('/api/credit-config', credit.router);

  app.use(errorHandler);

  return app;
}
