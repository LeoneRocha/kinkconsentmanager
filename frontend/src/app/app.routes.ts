import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'checklist',
  },
  {
    path: 'checklist',
    loadChildren: () =>
      import('./features/checklist/checklist.routes').then((m) => m.CHECKLIST_ROUTES),
  },
  {
    path: 'export',
    loadChildren: () => import('./features/export/export.routes').then((m) => m.EXPORT_ROUTES),
  },
  {
    path: '**',
    redirectTo: 'checklist',
  },
];
