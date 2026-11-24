import { Routes } from '@angular/router';
import { ExportPageComponent } from './pages/export-page';

export const EXPORT_ROUTES: Routes = [
  {
    path: '',
    title: 'Exportar Checklist — Kink Consent Manager',
    component: ExportPageComponent,
  },
];
