import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { ChecklistSchema } from '../../../../core/models';
import { SCHEMA_REPOSITORY_TOKEN } from '../../../../core/repositories';
import { ChecklistStateService } from '../../../../core/services';
import { DashboardPageComponent } from './dashboard-page.component';

const MOCK_SCHEMA: ChecklistSchema = {
  schemaVersion: '1.0.0',
  scales: [
    { id: 'enjoy', order: 1, color: '#388E3C', contrastColor: '#FFFFFF', icon: 'pi pi-check' },
  ],
  groups: [
    {
      id: 'grp_bondage',
      order: 1,
      defaultDualRole: true,
      rolePairId: 'giving_receiving',
      items: [
        { id: 'item_rope', type: 'scale_matrix' },
        { id: 'item_cuffs', type: 'scale_matrix' },
      ],
    },
  ],
};

describe('DashboardPageComponent', () => {
  let fixture: ComponentFixture<DashboardPageComponent>;
  let checklistState: ChecklistStateService;
  let router: Router;
  let getChecklistSchemaMock: jest.Mock<Observable<ChecklistSchema>, [version?: string]>;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();

    getChecklistSchemaMock = jest.fn(() => of(MOCK_SCHEMA));

    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        provideRouter([]),
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
        {
          provide: SCHEMA_REPOSITORY_TOKEN,
          useValue: { getChecklistSchema: getChecklistSchemaMock },
        },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        dashboardTitle: 'Painel Inicial',
        dashboardSubtitle: 'Escolha uma ferramenta.',
        dashboardSectionTitle: 'Ferramentas',
        dashboardStatusAvailable: 'Disponível',
        dashboardChecklistTitle: 'Checklist de Limites e Consentimento',
        dashboardChecklistDesc: 'Descrição do checklist.',
        dashboardChecklistCtaStart: 'Abrir Checklist',
        dashboardChecklistCtaContinue: 'Continuar Checklist',
      },
    });
    translate.use('pt-BR');

    checklistState = TestBed.inject(ChecklistStateService);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(DashboardPageComponent);
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  // Cenário: Exibição do Dashboard inicial com cartão do Checklist sem progresso salvo e com progresso local.
  // Objetivo: Garantir carregamento inicial do schema para contagem, exibição do cartão funcional e badge de progresso quando houver respostas.
  it('should render Checklist feature card and update badge/CTA when local progress exists', async () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const card = hostEl.querySelector<HTMLButtonElement>('button[data-feature-id="checklist"]')!;
    expect(card).not.toBeNull();
    expect(card.textContent).toContain('Checklist de Limites e Consentimento');
    expect(card.textContent).toContain('Abrir Checklist');
    expect(card.querySelector('.dashboard__progress-badge')).toBeNull();

    checklistState.setItemAnswer('item_rope', { primaryScale: 'enjoy' });
    await fixture.whenStable();

    expect(card.textContent).toContain('Continuar Checklist');
    expect(card.querySelector('.dashboard__progress-badge')?.textContent).toContain('1 / 2 (50%)');
  });

  // Cenário: Clique do usuário no cartão do Checklist no Dashboard.
  // Objetivo: Navegar para a rota `/checklist` para escolha do modo de preenchimento.
  it('should navigate to /checklist when the Checklist card is clicked', () => {
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    const hostEl = fixture.nativeElement as HTMLElement;

    hostEl.querySelector<HTMLButtonElement>('button[data-feature-id="checklist"]')?.click();

    expect(navigateSpy).toHaveBeenCalledWith(['/checklist']);
  });
});
