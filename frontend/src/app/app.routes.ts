import { Routes } from '@angular/router';
import { APP_ROUTE_SEGMENTS } from './core/routes';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: APP_ROUTE_SEGMENTS.dashboard,
  },
  {
    path: APP_ROUTE_SEGMENTS.dashboard,
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
  },
  {
    path: APP_ROUTE_SEGMENTS.checklist,
    loadChildren: () =>
      import('./features/checklist/checklist.routes').then((m) => m.CHECKLIST_ROUTES),
  },
  {
    path: '**',
    redirectTo: APP_ROUTE_SEGMENTS.dashboard,
  },
];
