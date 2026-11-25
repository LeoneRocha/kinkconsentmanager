/**
 * Registro central de rotas globais da aplicação (segmentos, URLs, comandos de navegação e títulos).
 * Mantido livre de imports de componentes para preservar 100% do lazy loading dos módulos.
 */
export const APP_ROUTE_SEGMENTS = {
  dashboard: 'dashboard',
  checklist: 'checklist',
  checklistStart: '',
  checklistFill: 'fill',
  checklistExport: 'export',
  export: 'export',
} as const;

export const APP_ROUTE_URLS = {
  dashboard: `/${APP_ROUTE_SEGMENTS.dashboard}`,
  checklist: `/${APP_ROUTE_SEGMENTS.checklist}`,
  checklistFill: `/${APP_ROUTE_SEGMENTS.checklist}/${APP_ROUTE_SEGMENTS.checklistFill}`,
  checklistExport: `/${APP_ROUTE_SEGMENTS.checklist}/${APP_ROUTE_SEGMENTS.checklistExport}`,
  export: `/${APP_ROUTE_SEGMENTS.checklist}/${APP_ROUTE_SEGMENTS.checklistExport}`,
} as const;

export const APP_ROUTE_COMMANDS = {
  dashboard: [APP_ROUTE_URLS.dashboard] as readonly string[],
  checklist: [APP_ROUTE_URLS.checklist] as readonly string[],
  checklistFill: [APP_ROUTE_URLS.checklist, APP_ROUTE_SEGMENTS.checklistFill] as readonly string[],
  checklistExport: [
    APP_ROUTE_URLS.checklist,
    APP_ROUTE_SEGMENTS.checklistExport,
  ] as readonly string[],
  export: [APP_ROUTE_URLS.checklist, APP_ROUTE_SEGMENTS.checklistExport] as readonly string[],
} as const;

export const APP_ROUTE_TITLES = {
  dashboard: 'Kink Consent Manager — Painel Inicial',
  checklistStart: 'Kink Consent Manager — Escolher Modo do Checklist',
  checklistFill: 'Kink Consent Manager — Preenchimento do Checklist',
  export: 'Exportar Checklist — Kink Consent Manager',
} as const;
