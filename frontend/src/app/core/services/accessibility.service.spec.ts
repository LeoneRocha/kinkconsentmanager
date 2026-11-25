import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ACCESSIBILITY_STORAGE_KEY, AccessibilityService } from './accessibility.service';

class MockSpeechSynthesisUtterance {
  text: string;
  lang = '';
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

describe('AccessibilityService', () => {
  const scope = globalThis as unknown as {
    speechSynthesis?: unknown;
    SpeechSynthesisUtterance?: unknown;
  };
  const originalSpeechSynthesis = scope.speechSynthesis;
  const originalUtterance = scope.SpeechSynthesisUtterance;

  const clearDomClasses = (): void => {
    document.documentElement.classList.remove(
      'app-high-contrast',
      'app-font-large',
      'app-font-xlarge',
      'app-reduced-motion',
    );
  };

  beforeEach(() => {
    localStorage.clear();
    clearDomClasses();

    TestBed.configureTestingModule({
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    });
  });

  afterEach(() => {
    localStorage.clear();
    clearDomClasses();
    if (originalSpeechSynthesis === undefined) {
      delete scope.speechSynthesis;
    } else {
      scope.speechSynthesis = originalSpeechSynthesis;
    }
    if (originalUtterance === undefined) {
      delete scope.SpeechSynthesisUtterance;
    } else {
      scope.SpeechSynthesisUtterance = originalUtterance;
    }
    jest.restoreAllMocks();
  });

  // Cenário: Ativação de alto contraste, escala de fonte e redução de movimento.
  // Objetivo: Garantir que classes DOM sejam aplicadas na raiz e preferências sejam persistidas.
  it('should apply DOM classes and persist visual accessibility preferences', () => {
    const service = TestBed.inject(AccessibilityService);

    expect(service.hasActiveAssists()).toBe(false);

    service.toggleHighContrast();
    service.setFontScale('xlarge');
    service.toggleReducedMotion();

    expect(service.hasActiveAssists()).toBe(true);
    expect(document.documentElement.classList.contains('app-high-contrast')).toBe(true);
    expect(document.documentElement.classList.contains('app-font-xlarge')).toBe(true);
    expect(document.documentElement.classList.contains('app-reduced-motion')).toBe(true);

    const saved = JSON.parse(localStorage.getItem(ACCESSIBILITY_STORAGE_KEY) ?? '{}') as Record<
      string,
      unknown
    >;
    expect(saved['highContrast']).toBe(true);
    expect(saved['fontScale']).toBe('xlarge');
    expect(saved['reducedMotion']).toBe(true);

    service.resetPreferences();
    expect(service.hasActiveAssists()).toBe(false);
    expect(document.documentElement.classList.contains('app-high-contrast')).toBe(false);
    expect(document.documentElement.classList.contains('app-font-xlarge')).toBe(false);
    expect(document.documentElement.classList.contains('app-reduced-motion')).toBe(false);
  });

  // Cenário: Restauração de preferências salvas anteriormente no localStorage.
  // Objetivo: Aplicar automaticamente alto contraste e fonte grande na inicialização.
  it('should restore persisted accessibility preferences on initialization', () => {
    localStorage.setItem(
      ACCESSIBILITY_STORAGE_KEY,
      JSON.stringify({
        audioAssistEnabled: true,
        visualCaptionsEnabled: true,
        speechRate: 1.2,
        highContrast: true,
        fontScale: 'large',
        reducedMotion: false,
      }),
    );

    const service = TestBed.inject(AccessibilityService);

    expect(service.audioAssistEnabled()).toBe(true);
    expect(service.visualCaptionsEnabled()).toBe(true);
    expect(service.speechRate()).toBe(1.2);
    expect(document.documentElement.classList.contains('app-high-contrast')).toBe(true);
    expect(document.documentElement.classList.contains('app-font-large')).toBe(true);
  });

  // Cenário: Leitura em voz alta (Web Speech API) com legendas visuais ao vivo.
  // Objetivo: Acionar speechSynthesis com idioma/velocidade configurados, atualizar legenda e interromper sob demanda.
  it('should speak text via Web Speech API and update live caption state', () => {
    const cancelMock = jest.fn();
    const state: { utterance: MockSpeechSynthesisUtterance | null } = { utterance: null };
    const speakMock = jest.fn((utterance: MockSpeechSynthesisUtterance) => {
      state.utterance = utterance;
    });

    scope.speechSynthesis = { cancel: cancelMock, speak: speakMock };
    scope.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

    const service = TestBed.inject(AccessibilityService);
    service.setSpeechRate(0.85);
    service.toggleVisualCaptions();

    service.speak('Sistema de Safeword', { force: true });

    expect(service.liveAnnouncement()).toBe('Sistema de Safeword');
    expect(service.showCaptionBar()).toBe(true);
    expect(service.isSpeaking()).toBe(true);
    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(state.utterance?.lang).toBe('pt-BR');
    expect(state.utterance?.rate).toBe(0.85);

    state.utterance?.onend?.();
    expect(service.isSpeaking()).toBe(false);

    service.announce('Nova resposta registrada', false);
    expect(service.liveAnnouncement()).toBe('Nova resposta registrada');

    service.dismissCaption();
    expect(service.liveAnnouncement()).toBe('');
    expect(service.showCaptionBar()).toBe(false);
  });

  // Cenário: Ambiente sem suporte à Web Speech API (como jsdom ou navegadores restritos).
  // Objetivo: Manter o fallback visual/ARIA funcionando sem lançar exceções.
  it('should gracefully handle environments without Web Speech API support', () => {
    delete scope.speechSynthesis;
    delete scope.SpeechSynthesisUtterance;

    const service = TestBed.inject(AccessibilityService);
    expect(service.isSpeechSupported()).toBe(false);

    service.toggleAudioAssist();
    service.announce('Item selecionado');

    expect(service.liveAnnouncement()).toBe('Item selecionado');
    expect(service.isSpeaking()).toBe(false);
    expect(() => service.stopSpeaking()).not.toThrow();
  });

  // Cenário: Extração de texto acessível por prioridade (aria-label > alt > title > img[alt] > textContent).
  // Objetivo: Garantir que botões, imagens, ícones e textos forneçam rótulo claro ao leitor audiovisual.
  it('should extract accessible label by priority across attributes and nested media', () => {
    const service = TestBed.inject(AccessibilityService);

    const btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Botão Prioritário');
    btn.setAttribute('title', 'Título Secundário');
    btn.textContent = 'Texto Visível';
    expect(service.extractAccessibleText(btn)).toBe('Botão Prioritário');

    const img = document.createElement('img');
    img.setAttribute('alt', 'Logotipo KCM');
    img.setAttribute('title', 'Título Imagem');
    expect(service.extractAccessibleText(img)).toBe('Logotipo KCM');

    const icon = document.createElement('i');
    icon.setAttribute('title', 'Ícone de Informação');
    expect(service.extractAccessibleText(icon)).toBe('Ícone de Informação');

    const linkWithImg = document.createElement('a');
    linkWithImg.innerHTML = '<img src="favicon.svg" alt="Painel Inicial" />';
    expect(service.extractAccessibleText(linkWithImg)).toBe('Painel Inicial');

    const labelSpan = document.createElement('span');
    labelSpan.textContent = '   Texto   Normalizado   ';
    expect(service.extractAccessibleText(labelSpan)).toBe('Texto Normalizado');
    expect(service.extractAccessibleText(null)).toBe('');
  });

  // Cenário: Foco em elemento com assistente de áudio/legenda desativado ou ativado.
  // Objetivo: Não anunciar quando inativo, ignorar regiões aria-live e anunciar via legenda/voz quando ativo.
  it('should announce focused elements only when audio assist or visual captions are enabled', () => {
    const service = TestBed.inject(AccessibilityService);
    const targetBtn = document.createElement('button');
    targetBtn.setAttribute('title', 'Abrir Checklist');

    service.announceElement(targetBtn);
    expect(service.liveAnnouncement()).toBe('');

    service.toggleVisualCaptions();
    service.announceElement(targetBtn);
    expect(service.liveAnnouncement()).toBe('Abrir Checklist');
    expect(service.showCaptionBar()).toBe(true);

    const liveContainer = document.createElement('div');
    liveContainer.setAttribute('aria-live', 'polite');
    const nested = document.createElement('span');
    nested.setAttribute('title', 'Ignorar');
    liveContainer.appendChild(nested);
    service.announceElement(nested);
    expect(service.liveAnnouncement()).toBe('Abrir Checklist');
  });
});
