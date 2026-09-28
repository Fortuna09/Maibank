import express from 'express';
import { testDatabaseConnection } from './db.js';
import { createAuthenticate } from './http/authenticate.js';
import { requireAdmin } from './http/requireAdmin.js';
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
import { AdminController, MessagesController } from './modules/messages/MessagesController.js';
import { MessagesRepository } from './modules/messages/MessagesRepository.js';
import { MessagesService } from './modules/messages/MessagesService.js';
import { RecurringController } from './modules/recurring/RecurringController.js';
import { RecurringRepository } from './modules/recurring/RecurringRepository.js';
import { RecurringService } from './modules/recurring/RecurringService.js';
import { SalaryController } from './modules/salary/SalaryController.js';
import { SalaryRepository } from './modules/salary/SalaryRepository.js';
import { SalaryService } from './modules/salary/SalaryService.js';
import { SettingsController } from './modules/settings/SettingsController.js';
import { ShortcutsController } from './modules/shortcuts/ShortcutsController.js';
import { ShortcutsRepository } from './modules/shortcuts/ShortcutsRepository.js';
import { ShortcutsService } from './modules/shortcuts/ShortcutsService.js';
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
  const recurringRepository = new RecurringRepository();

  const sessions = new SessionTokens();
  const authService = new AuthService(new AuthRepository(), settingsRepository, new Mailer());
  const authenticate = createAuthenticate(authService, sessions);

  const auth = new AuthController(authService, sessions, authenticate);
  const settings = new SettingsController(new SettingsService(settingsRepository));
  const transactionsService = new TransactionsService(transactionsRepository, recurringRepository);
  const transactions = new TransactionsController(transactionsService);
  const recurring = new RecurringController(new RecurringService(recurringRepository, settingsRepository, transactionsRepository));
  const goals = new GoalsController(new GoalsService(new GoalsRepository()));
  const salary = new SalaryController(new SalaryService(new SalaryRepository(), settingsRepository, transactionsRepository));
  const credit = new CreditController(new CreditService(new CreditRepository()));
  const messagesService = new MessagesService(new MessagesRepository());
  const messages = new MessagesController(messagesService);
  const admin = new AdminController(messagesService);
  const shortcuts = new ShortcutsController(
    new ShortcutsService(new ShortcutsRepository(), settingsRepository, transactionsService),
    authenticate
  );

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
  // Siri/Atalhos: /gasto se autentica pela chave pessoal; o resto da rota exige login (ver o controller).
  app.use('/api/atalho', shortcuts.router);

  // Daqui para baixo tudo exige login, e cada consulta é filtrada pelo usuário da sessão.
  app.use('/api/settings', authenticate, settings.router);
  app.use('/api/transactions', authenticate, transactions.router);
  app.use('/api/recurring', authenticate, recurring.router);
  app.use('/api/goals', authenticate, goals.router);
  app.use('/api/salary-config', authenticate, salary.router);
  app.use('/api/credit-config', authenticate, credit.router);
  app.use('/api/messages', authenticate, messages.router);
  app.use('/api/admin', authenticate, requireAdmin, admin.router);

  app.use('/api', (_req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));
  app.use(errorHandler);

  return app;
}

export default createApp();
