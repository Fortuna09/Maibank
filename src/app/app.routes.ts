import { Routes } from '@angular/router';
import { HomePage } from './Pages/home-page/home-page';
import { TransactionsPage } from './Pages/transactions-page/transactions-page';
import { OverviewPage } from './Pages/transactions-page/sub-pages/overview-page/overview-page';
import { HistoryPage } from './Pages/transactions-page/sub-pages/history-page/history-page';
import { GoalsPage } from './Pages/goals-page/goals-page';
import { CreditPage } from './Pages/credit-page/credit-page';
import { InvoicesPage } from './Pages/credit-page/sub-pages/invoices-page/invoices-page';
import { SimulationPage } from './Pages/simulation-page/simulation-page';
import { PurchaseSimulationPage } from './Pages/simulation-page/sub-pages/purchase-simulation-page/purchase-simulation-page';
import { CreditSimulationPage } from './Pages/simulation-page/sub-pages/credit-simulation-page/credit-simulation-page';
import { SettingsPage } from './Pages/settings-page/settings-page';
import { AppearancePage } from './Pages/settings-page/sub-pages/appearance-page/appearance-page';
import { DistributionPage } from './Pages/settings-page/sub-pages/distribution-page/distribution-page';
import { SalaryPage } from './Pages/settings-page/sub-pages/salary-page/salary-page';
import { CreditSettingsPage } from './Pages/settings-page/sub-pages/credit-settings-page/credit-settings-page';
import { AssistantSettingsPage } from './Pages/settings-page/sub-pages/assistant-settings-page/assistant-settings-page';

export const routes: Routes = [
	{
		path: '',
		component: HomePage,
	},
	{
		path: 'lancamentos',
		component: TransactionsPage,
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'geral' },
			{ path: 'geral', component: OverviewPage },
			{ path: 'historico', component: HistoryPage },
		],
	},
	{
		path: 'metas',
		component: GoalsPage,
	},
	{
		path: 'credito',
		component: CreditPage,
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'faturas' },
			{ path: 'faturas', component: InvoicesPage },
		],
	},
	{
		path: 'simulacao',
		component: SimulationPage,
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'lancamento' },
			{ path: 'lancamento', component: PurchaseSimulationPage },
			{ path: 'credito', component: CreditSimulationPage },
		],
	},
	{
		path: 'configuracoes',
		component: SettingsPage,
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'aparencia' },
			{ path: 'aparencia', component: AppearancePage },
			{ path: 'distribuicao', component: DistributionPage },
			{ path: 'salario', component: SalaryPage },
			{ path: 'credito', component: CreditSettingsPage },
			{ path: 'assistente', component: AssistantSettingsPage },
		],
	},
	// Rotas antigas, para links salvos continuarem funcionando
	{ path: 'financas/metas', redirectTo: 'metas' },
	{ path: 'financas/configuracao', redirectTo: 'configuracoes/distribuicao' },
	{ path: 'financas/lancamentos', redirectTo: 'lancamentos/historico' },
	{ path: 'financas', redirectTo: 'lancamentos' },
	{
		path: '**',
		redirectTo: '',
	},
];
