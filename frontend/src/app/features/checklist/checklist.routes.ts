import { Routes } from '@angular/router';
import { ChecklistPageComponent } from './pages/checklist-page';

export const CHECKLIST_ROUTES: Routes = [
  {
    path: '',
    title: 'Kink Consent Manager — Checklist de Limites e Consentimento',
    component: ChecklistPageComponent,
  },
];
