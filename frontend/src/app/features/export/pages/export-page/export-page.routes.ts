import { Routes } from '@angular/router';
import { APP_ROUTE_TITLES } from '../../../../core/routes';
import { ExportPageComponent } from './export-page.component';

export const EXPORT_PAGE_ROUTES: Routes = [
  {
    path: '',
    title: APP_ROUTE_TITLES.export,
    component: ExportPageComponent,
  },
];
