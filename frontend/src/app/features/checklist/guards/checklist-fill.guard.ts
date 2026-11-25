import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { APP_ROUTE_COMMANDS } from '../../../core/routes';
import { ChecklistAutosaveService, ChecklistStateService } from '../../../core/services';

/**
 * Protege a rota de preenchimento (`/checklist/fill`), permitindo acesso apenas quando o usuário
 * escolheu um modo de visualização na etapa `/checklist` ou possui preenchimento/estado salvo.
 * Caso contrário, redireciona para `/checklist`.
 */
export const checklistFillGuard: CanActivateFn = async () => {
  const checklistState = inject(ChecklistStateService);
  const autosave = inject(ChecklistAutosaveService);
  const router = inject(Router);

  if (checklistState.canEnterFillRoute()) {
    return true;
  }

  await autosave.restoreFromAutosave();
  if (checklistState.canEnterFillRoute()) {
    return true;
  }

  return router.createUrlTree(APP_ROUTE_COMMANDS.checklist);
};
