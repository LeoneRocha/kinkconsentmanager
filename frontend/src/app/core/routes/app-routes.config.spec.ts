import { routes } from '../../app.routes';
import { CHECKLIST_ROUTES } from '../../features/checklist/checklist.routes';
import { checklistFillGuard } from '../../features/checklist/guards';
import { CHECKLIST_PAGE_ROUTES } from '../../features/checklist/pages/checklist-page';
import { CHECKLIST_START_PAGE_ROUTES } from '../../features/checklist/pages/checklist-start-page';
import { DASHBOARD_ROUTES } from '../../features/dashboard/dashboard.routes';
import { DASHBOARD_PAGE_ROUTES } from '../../features/dashboard/pages/dashboard-page';
import { EXPORT_ROUTES } from '../../features/export/export.routes';
import { EXPORT_PAGE_ROUTES } from '../../features/export/pages/export-page';
import {
  APP_ROUTE_COMMANDS,
  APP_ROUTE_SEGMENTS,
  APP_ROUTE_TITLES,
  APP_ROUTE_URLS,
} from './app-routes.config';

describe('app-routes.config', () => {
  // Cenário: Consistência entre catálogo global de rotas, rotas raiz e sub-rotas aninhadas em checklist.
  // Objetivo: Garantir que cada página possua seu arquivo de rotas próprio composto nas features e com exportação sob `/checklist/export`.
  it('should align global route segments, URLs, navigation commands, and nested checklist/export routes', () => {
    expect(APP_ROUTE_URLS.dashboard).toBe('/dashboard');
    expect(APP_ROUTE_URLS.checklist).toBe('/checklist');
    expect(APP_ROUTE_URLS.checklistFill).toBe('/checklist/fill');
    expect(APP_ROUTE_URLS.checklistExport).toBe('/checklist/export');
    expect(APP_ROUTE_URLS.export).toBe('/checklist/export');

    expect(APP_ROUTE_COMMANDS.dashboard).toEqual(['/dashboard']);
    expect(APP_ROUTE_COMMANDS.checklist).toEqual(['/checklist']);
    expect(APP_ROUTE_COMMANDS.checklistFill).toEqual(['/checklist', 'fill']);
    expect(APP_ROUTE_COMMANDS.checklistExport).toEqual(['/checklist', 'export']);
    expect(APP_ROUTE_COMMANDS.export).toEqual(['/checklist', 'export']);

    expect(routes.map((route) => route.path)).toEqual([
      '',
      APP_ROUTE_SEGMENTS.dashboard,
      APP_ROUTE_SEGMENTS.checklist,
      '**',
    ]);
    expect(routes[0]?.redirectTo).toBe(APP_ROUTE_SEGMENTS.dashboard);
    expect(routes[3]?.redirectTo).toBe(APP_ROUTE_SEGMENTS.dashboard);

    expect(DASHBOARD_ROUTES).toEqual([...DASHBOARD_PAGE_ROUTES]);
    expect(DASHBOARD_PAGE_ROUTES[0]?.title).toBe(APP_ROUTE_TITLES.dashboard);

    expect(CHECKLIST_ROUTES.slice(0, 2)).toEqual([
      ...CHECKLIST_START_PAGE_ROUTES,
      ...CHECKLIST_PAGE_ROUTES,
    ]);
    expect(CHECKLIST_ROUTES[0]?.path).toBe(APP_ROUTE_SEGMENTS.checklistStart);
    expect(CHECKLIST_ROUTES[1]?.path).toBe(APP_ROUTE_SEGMENTS.checklistFill);
    expect(CHECKLIST_ROUTES[1]?.canActivate).toEqual([checklistFillGuard]);
    expect(CHECKLIST_ROUTES[2]?.path).toBe(APP_ROUTE_SEGMENTS.checklistExport);
    expect(typeof CHECKLIST_ROUTES[2]?.loadChildren).toBe('function');

    expect(EXPORT_ROUTES).toEqual([...EXPORT_PAGE_ROUTES]);
    expect(EXPORT_PAGE_ROUTES[0]?.title).toBe(APP_ROUTE_TITLES.export);
  });
});
