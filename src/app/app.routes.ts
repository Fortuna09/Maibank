import { Routes } from '@angular/router';
import { HomePage } from './Pages/home-page/home-page';
import { FinancePage } from './Pages/finance-page/finance-page';
import { FinanceOverviewPage } from './Pages/finance-page/sub-pages/finance-overview-page/finance-overview-page';
import { FinanceTransactionsPage } from './Pages/finance-page/sub-pages/finance-transactions-page/finance-transactions-page';
import { FinanceGoalsPage } from './Pages/finance-page/sub-pages/finance-goals-page/finance-goals-page';
import { FinanceDistributionPage } from './Pages/finance-page/sub-pages/finance-distribution-page';

export const routes: Routes = [
	{
	path: '',
	component: HomePage,
	},
	{
	path: 'financas',
	component: FinancePage,
	children: [
		{
			path: '',
			pathMatch: 'full',
			redirectTo: 'geral',
		},
		{
			path: 'geral',
			component: FinanceOverviewPage,
		},
		{
			path: 'lancamentos',
			component: FinanceTransactionsPage,
		},
		{
			path: 'metas',
			component: FinanceGoalsPage,
		},
		{
			path: 'configuracao',
			component: FinanceDistributionPage,
		},
		{
			path: 'distribuicao',
			redirectTo: 'configuracao',
			pathMatch: 'full',
		},
	],
	},
	{
	path: '**',
	redirectTo: '',
	},
];
