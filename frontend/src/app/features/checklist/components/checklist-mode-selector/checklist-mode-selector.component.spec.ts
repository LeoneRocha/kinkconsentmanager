import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChecklistViewMode } from '../../../../core/models';
import {
  ChecklistModeSelectorComponent,
  ChecklistModeSelectorLabels,
} from './checklist-mode-selector.component';

const MOCK_LABELS: ChecklistModeSelectorLabels = {
  brandTitle: 'KinkConsentManager',
  pageTitle: 'Como você prefere preencher o checklist?',
  pageSubtitle: 'Escolha o formato mais confortável.',
  privacyNotice: 'Privacidade 100% local.',
  howToFillLabel: 'Como preencher',
  startButton: 'Começar neste modo',
  continueButton: 'Continuar neste modo',
  existingProgressLabel: 'Progresso local encontrado',
  stepperTitle: 'Guiado (Passos)',
  stepperBadge: 'Recomendado',
  stepperDesc: 'Avance uma categoria por vez.',
  stepperHowToFill: 'Responda todos os itens do passo atual antes de avançar.',
  classicTitle: 'Modo Clássico',
  classicBadge: 'Folha compacta',
  classicDesc: 'Blocos tradicionais com círculos coloridos.',
  classicHowToFill: 'Clique nos círculos coloridos de cada item.',
  fullTitle: 'Visão Completa',
  fullBadge: 'Página única',
  fullDesc: 'Todas as categorias abertas.',
  fullHowToFill: 'Role livremente e responda na mesma tela.',
  quickFillTitle: 'Preenchimento Rápido',
  quickFillBadge: 'Atalhos 1–5',
  quickFillDesc: 'Um item por vez em fluxo ágil.',
  quickFillHowToFill: 'Pressione teclas 1 a 5 para escolher a escala.',
  importTitle: 'Já tem um preenchimento salvo em JSON?',
  importDesc: 'Importe seu arquivo .json salvo anteriormente.',
  importButton: 'Importar JSON',
};

describe('ChecklistModeSelectorComponent', () => {
  let fixture: ComponentFixture<ChecklistModeSelectorComponent>;
  let component: ChecklistModeSelectorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChecklistModeSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChecklistModeSelectorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('labels', MOCK_LABELS);
    await fixture.whenStable();
  });

  it('should render all 4 filling modes with descriptions and how-to-fill instructions and emit selectMode', () => {
    const emitted: ChecklistViewMode[] = [];
    component.selectMode.subscribe((mode) => emitted.push(mode));

    const hostEl = fixture.nativeElement as HTMLElement;
    const cards = hostEl.querySelectorAll<HTMLButtonElement>('button[data-start-mode]');
    expect(cards.length).toBe(4);
    expect(hostEl.textContent).toContain('Responda todos os itens do passo atual');
    expect(hostEl.textContent).toContain('Clique nos círculos coloridos');
    expect(hostEl.textContent).toContain('Role livremente e responda');
    expect(hostEl.textContent).toContain('Pressione teclas 1 a 5');
    expect(hostEl.querySelector('.mode-selector__saved-banner')).toBeNull();

    cards.forEach((card) => card.click());
    expect(emitted).toEqual(['stepper', 'classic', 'full', 'quick_fill']);
  });

  it('should show saved local progress banner and continue label when answeredCount > 0', async () => {
    fixture.componentRef.setInput('answeredCount', 12);
    fixture.componentRef.setInput('totalCount', 51);
    fixture.componentRef.setInput('progressPercentage', 24);
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const banner = hostEl.querySelector('.mode-selector__saved-banner');
    expect(banner?.textContent).toContain('12 / 51 (24%)');
    expect(hostEl.querySelector('.mode-selector__cta')?.textContent).toContain(
      'Continuar neste modo',
    );
  });

  it('should trigger hidden file input on import button click, emit selected File, and reset input value', () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const fileInput = hostEl.querySelector<HTMLInputElement>('input[type="file"]')!;
    const clickSpy = jest.spyOn(fileInput, 'click').mockImplementation(() => {});

    expect(fileInput.accept).toBe('.json,application/json');

    hostEl.querySelector<HTMLButtonElement>('button[data-action="import-json"]')?.click();
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const importedFiles: File[] = [];
    component.importJsonFile.subscribe((file) => importedFiles.push(file));

    const mockFile = new File(['{"schemaVersion":"1.0.0"}'], 'draft.json', {
      type: 'application/json',
    });
    const mockFileList: FileList = {
      0: mockFile,
      length: 1,
      item: (index: number) => (index === 0 ? mockFile : null),
      [Symbol.iterator]: () => [mockFile].values(),
    };
    Object.defineProperty(fileInput, 'files', {
      value: mockFileList,
      configurable: true,
    });

    fileInput.dispatchEvent(new Event('change'));

    expect(importedFiles).toEqual([mockFile]);
    expect(fileInput.value).toBe('');
  });
});
