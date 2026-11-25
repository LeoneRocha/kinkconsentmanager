import { Routes } from '@angular/router';
import { APP_ROUTE_SEGMENTS } from '../../core/routes';
import { CHECKLIST_PAGE_ROUTES } from './pages/checklist-page';
import { CHECKLIST_START_PAGE_ROUTES } from './pages/checklist-start-page';

export const CHECKLIST_ROUTES: Routes = [
  ...CHECKLIST_START_PAGE_ROUTES,
  ...CHECKLIST_PAGE_ROUTES,
  {
    path: APP_ROUTE_SEGMENTS.checklistExport,
    loadChildren: () => import('../export/export.routes').then((m) => m.EXPORT_ROUTES),
  },
];
