import express from 'express';
import { testDatabaseConnection } from './db.js';
import { createAuthenticate } from './http/authenticate.js';
import { errorHandler } from './http/errorHandler.js';
import { Mailer } from './mail/Mailer.js';
import { AuthController } from './modules/auth/AuthController.js';
import { AuthRepository } from './modules/auth/AuthRepository.js';
import { AuthService } from './modules/auth/AuthService.js';
import { SessionTokens } from './modules/auth/SessionTokens.js';
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
 *
 * Front e API ficam no mesmo domínio (proxy do `ng serve` no desenvolvimento,
 * rewrite da Vercel em produção), então não há CORS: o cookie de sessão é first-party.
 */
export function createApp() {
  const settingsRepository = new SettingsRepository();
  const transactionsRepository = new TransactionsRepository();

  const sessions = new SessionTokens();
  const authService = new AuthService(new AuthRepository(), settingsRepository, new Mailer());
  const authenticate = createAuthenticate(authService, sessions);

  const auth = new AuthController(authService, sessions, authenticate);
  const settings = new SettingsController(new SettingsService(settingsRepository));
  const transactions = new TransactionsController(new TransactionsService(transactionsRepository));
  const goals = new GoalsController(new GoalsService(new GoalsRepository()));
  const salary = new SalaryController(new SalaryService(new SalaryRepository(), settingsRepository, transactionsRepository));
  const credit = new CreditController(new CreditService(new CreditRepository()));

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', async (_req, res) => {
    try {
      await testDatabaseConnection();
      res.json({ ok: true, database: 'connected' });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.use('/api/auth', auth.router);

  // Daqui para baixo tudo exige login, e cada consulta é filtrada pelo usuário da sessão.
  app.use('/api/settings', authenticate, settings.router);
  app.use('/api/transactions', authenticate, transactions.router);
  app.use('/api/goals', authenticate, goals.router);
  app.use('/api/salary-config', authenticate, salary.router);
  app.use('/api/credit-config', authenticate, credit.router);

  app.use('/api', (_req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));
  app.use(errorHandler);

  return app;
}

export default createApp();
