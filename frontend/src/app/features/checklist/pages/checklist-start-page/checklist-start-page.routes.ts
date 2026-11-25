import { Routes } from '@angular/router';
import { APP_ROUTE_SEGMENTS, APP_ROUTE_TITLES } from '../../../../core/routes';
import { ChecklistStartPageComponent } from './checklist-start-page.component';

export const CHECKLIST_START_PAGE_ROUTES: Routes = [
  {
    path: APP_ROUTE_SEGMENTS.checklistStart,
    title: APP_ROUTE_TITLES.checklistStart,
    component: ChecklistStartPageComponent,
  },
];
