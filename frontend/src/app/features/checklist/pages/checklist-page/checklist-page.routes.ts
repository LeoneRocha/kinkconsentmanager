import { Routes } from '@angular/router';
import { APP_ROUTE_SEGMENTS, APP_ROUTE_TITLES } from '../../../../core/routes';
import { checklistFillGuard } from '../../guards';
import { ChecklistPageComponent } from './checklist-page.component';

export const CHECKLIST_PAGE_ROUTES: Routes = [
  {
    path: APP_ROUTE_SEGMENTS.checklistFill,
    canActivate: [checklistFillGuard],
    title: APP_ROUTE_TITLES.checklistFill,
    component: ChecklistPageComponent,
  },
];
