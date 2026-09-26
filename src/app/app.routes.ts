import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './Guards/auth.guards';

// Cada tela é baixada só quando é aberta: a tela de login abre rápido mesmo no celular.

export const routes: Routes = [
	// Área logada: a casca (navbar, modal, Mai) fica montada entre as telas.
	// Vem antes das telas de login: uma rota-pai com filhos aceita casar com a URL vazia
	// mesmo sem filho correspondente, então a ordem decide quem responde por "/".
	{
		path: '',
		loadComponent: () => import('./Pages/app-shell/app-shell').then((m) => m.AppShell),
		canActivate: [authGuard],
		children: [
			{ path: '', pathMatch: 'full', loadComponent: () => import('./Pages/home-page/home-page').then((m) => m.HomePage) },
			{
				path: 'lancamentos',
				loadComponent: () => import('./Pages/transactions-page/transactions-page').then((m) => m.TransactionsPage),
				children: [
					{ path: '', pathMatch: 'full', redirectTo: 'geral' },
					{ path: 'geral', loadComponent: () => import('./Pages/transactions-page/sub-pages/overview-page/overview-page').then((m) => m.OverviewPage) },
					{ path: 'historico', loadComponent: () => import('./Pages/transactions-page/sub-pages/history-page/history-page').then((m) => m.HistoryPage) },
				],
			},
			{ path: 'metas', loadComponent: () => import('./Pages/goals-page/goals-page').then((m) => m.GoalsPage) },
			{
				path: 'credito',
				loadComponent: () => import('./Pages/credit-page/credit-page').then((m) => m.CreditPage),
				children: [
					{ path: '', pathMatch: 'full', redirectTo: 'faturas' },
					{ path: 'faturas', loadComponent: () => import('./Pages/credit-page/sub-pages/invoices-page/invoices-page').then((m) => m.InvoicesPage) },
				],
			},
			{
				path: 'simulacao',
				loadComponent: () => import('./Pages/simulation-page/simulation-page').then((m) => m.SimulationPage),
				children: [
					{ path: '', pathMatch: 'full', redirectTo: 'lancamento' },
					{ path: 'lancamento', loadComponent: () => import('./Pages/simulation-page/sub-pages/purchase-simulation-page/purchase-simulation-page').then((m) => m.PurchaseSimulationPage) },
					{ path: 'credito', loadComponent: () => import('./Pages/simulation-page/sub-pages/credit-simulation-page/credit-simulation-page').then((m) => m.CreditSimulationPage) },
				],
			},
			{
				path: 'configuracoes',
				loadComponent: () => import('./Pages/settings-page/settings-page').then((m) => m.SettingsPage),
				children: [
					{ path: '', pathMatch: 'full', redirectTo: 'aparencia' },
					{ path: 'aparencia', loadComponent: () => import('./Pages/settings-page/sub-pages/appearance-page/appearance-page').then((m) => m.AppearancePage) },
					{ path: 'distribuicao', loadComponent: () => import('./Pages/settings-page/sub-pages/distribution-page/distribution-page').then((m) => m.DistributionPage) },
					{ path: 'salario', loadComponent: () => import('./Pages/settings-page/sub-pages/salary-page/salary-page').then((m) => m.SalaryPage) },
					{ path: 'credito', loadComponent: () => import('./Pages/settings-page/sub-pages/credit-settings-page/credit-settings-page').then((m) => m.CreditSettingsPage) },
					{ path: 'assistente', loadComponent: () => import('./Pages/settings-page/sub-pages/assistant-settings-page/assistant-settings-page').then((m) => m.AssistantSettingsPage) },
					{ path: 'conta', loadComponent: () => import('./Pages/settings-page/sub-pages/account-page/account-page').then((m) => m.AccountPage) },
					{ path: 'ajuda', loadComponent: () => import('./Pages/settings-page/sub-pages/help-page/help-page').then((m) => m.HelpPage) },
				],
			},
			// Rotas antigas, para links salvos continuarem funcionando
			{ path: 'financas/metas', redirectTo: 'metas' },
			{ path: 'financas/configuracao', redirectTo: 'configuracoes/distribuicao' },
			{ path: 'financas/lancamentos', redirectTo: 'lancamentos/historico' },
			{ path: 'financas', redirectTo: 'lancamentos' },
		],
	},
	// Telas sem login. Confirmar e-mail e redefinir senha abrem pelo link do e-mail,
	// então funcionam com ou sem sessão.
	{
		path: '',
		loadComponent: () => import('./Pages/auth-page/auth-page').then((m) => m.AuthPage),
		children: [
			{ path: 'entrar', loadComponent: () => import('./Pages/auth-page/sub-pages/login-page/login-page').then((m) => m.LoginPage), canActivate: [guestGuard] },
			{ path: 'criar-conta', loadComponent: () => import('./Pages/auth-page/sub-pages/register-page/register-page').then((m) => m.RegisterPage), canActivate: [guestGuard] },
			{ path: 'esqueci-senha', loadComponent: () => import('./Pages/auth-page/sub-pages/forgot-password-page/forgot-password-page').then((m) => m.ForgotPasswordPage), canActivate: [guestGuard] },
			{ path: 'confirmar-email', loadComponent: () => import('./Pages/auth-page/sub-pages/verify-email-page/verify-email-page').then((m) => m.VerifyEmailPage) },
			{ path: 'redefinir-senha', loadComponent: () => import('./Pages/auth-page/sub-pages/reset-password-page/reset-password-page').then((m) => m.ResetPasswordPage) },
		],
	},
	{
		path: '**',
		redirectTo: '',
	},
];
