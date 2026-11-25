import { Routes } from '@angular/router';
import { APP_ROUTE_TITLES } from '../../../../core/routes';
import { DashboardPageComponent } from './dashboard-page.component';

export const DASHBOARD_PAGE_ROUTES: Routes = [
  {
    path: '',
    title: APP_ROUTE_TITLES.dashboard,
    component: DashboardPageComponent,
  },
];
