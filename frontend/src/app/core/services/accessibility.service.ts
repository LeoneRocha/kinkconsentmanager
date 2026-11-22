import { computed, DOCUMENT, inject, Injectable } from '@angular/core';
import { SupportedLanguage } from '../models';
import {
  AccessibilityPreferences,
  FontScale,
  PREF_ACCESSIBILITY_KEY,
  SpeechRate,
  USER_PREFERENCES_REPOSITORY_TOKEN,
} from '../repositories/user-preferences.repository';
import { BaseStateService } from './base-state.service';
import { I18nService } from './i18n.service';

export const ACCESSIBILITY_STORAGE_KEY = PREF_ACCESSIBILITY_KEY;
export type { AccessibilityPreferences, FontScale, SpeechRate };

export interface AccessibilityState extends AccessibilityPreferences {
  readonly isSpeaking: boolean;
  readonly liveAnnouncement: string;
}

export interface SpeakOptions {
  readonly lang?: SupportedLanguage;
  readonly force?: boolean;
}

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  audioAssistEnabled: false,
  visualCaptionsEnabled: false,
  speechRate: 1,
  highContrast: false,
  fontScale: 'normal',
  reducedMotion: false,
};

const INITIAL_STATE: AccessibilityState = {
  ...DEFAULT_PREFERENCES,
  isSpeaking: false,
  liveAnnouncement: '',
};

/**
 * Signal-backed accessibility service providing Zero-Knowledge client-side TTS, live visual captions,
 * high contrast (WCAG AAA), font scaling, and reduced motion preferences persisted via `UserPreferencesRepository`.
 */
@Injectable({ providedIn: 'root' })
export class AccessibilityService extends BaseStateService<AccessibilityState> {
  private readonly document = inject(DOCUMENT);
  private readonly preferencesRepo = inject(USER_PREFERENCES_REPOSITORY_TOKEN);
  private readonly i18n = inject(I18nService);

  readonly audioAssistEnabled = this.select('audioAssistEnabled');
  readonly visualCaptionsEnabled = this.select('visualCaptionsEnabled');
  readonly speechRate = this.select('speechRate');
  readonly highContrast = this.select('highContrast');
  readonly fontScale = this.select('fontScale');
  readonly reducedMotion = this.select('reducedMotion');
  readonly isSpeaking = this.select('isSpeaking');
  readonly liveAnnouncement = this.select('liveAnnouncement');

  readonly hasActiveAssists = computed<boolean>(
    () =>
      this.audioAssistEnabled() ||
      this.visualCaptionsEnabled() ||
      this.highContrast() ||
      this.fontScale() !== 'normal' ||
      this.reducedMotion() ||
      this.speechRate() !== 1,
  );

  readonly showCaptionBar = computed<boolean>(
    () =>
      (this.visualCaptionsEnabled() || this.isSpeaking()) &&
      this.liveAnnouncement().trim().length > 0,
  );

  constructor() {
    super(INITIAL_STATE);
    const restored = this.preferencesRepo.getAccessibility() ?? DEFAULT_PREFERENCES;
    this.setState(restored);
    this.applyDomClasses(this.state());
  }

  /**
   * Checks whether client-side Web Speech Synthesis is available in the current runtime.
   */
  isSpeechSupported(): boolean {
    const scope = globalThis as {
      speechSynthesis?: SpeechSynthesis | null;
      SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
    };
    return (
      typeof scope.speechSynthesis === 'object' &&
      scope.speechSynthesis !== null &&
      typeof scope.speechSynthesis.speak === 'function' &&
      typeof scope.SpeechSynthesisUtterance === 'function'
    );
  }

  /**
   * Updates screen-reader and visual caption live announcement and speaks aloud when active or forced.
   */
  speak(text: string, options?: SpeakOptions): void {
    const cleaned = text.trim();
    if (cleaned.length === 0) {
      return;
    }

    this.setState({ liveAnnouncement: cleaned });

    const shouldSpeak = Boolean(options?.force) || this.audioAssistEnabled();
    if (!shouldSpeak || !this.isSpeechSupported()) {
      return;
    }

    try {
      const scope = globalThis as unknown as {
        speechSynthesis: SpeechSynthesis;
        SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance;
      };
      if (typeof scope.speechSynthesis.cancel === 'function') {
        scope.speechSynthesis.cancel();
      }

      const utterance = new scope.SpeechSynthesisUtterance(cleaned);
      utterance.lang = options?.lang ?? this.i18n.currentLang();
      utterance.rate = this.speechRate();
      utterance.onend = () => {
        this.setState({ isSpeaking: false });
      };
      utterance.onerror = () => {
        this.setState({ isSpeaking: false });
      };

      this.setState({ isSpeaking: true });
      scope.speechSynthesis.speak(utterance);
    } catch {
      this.setState({ isSpeaking: false });
    }
  }

  /**
   * Stops any active Web Speech synthesis playback immediately.
   */
  stopSpeaking(): void {
    this.setState({ isSpeaking: false });
    if (!this.isSpeechSupported()) {
      return;
    }

    try {
      const synth = (globalThis as { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
      if (synth && typeof synth.cancel === 'function') {
        synth.cancel();
      }
    } catch {
      // Ignore browser errors during cancellation cleanup.
    }
  }

  /**
   * Announces a status message for screen readers and optional audio/visual caption channels.
   */
  announce(message: string, speakIfAudioAssist = true): void {
    const cleaned = message.trim();
    if (cleaned.length === 0) {
      return;
    }

    if (speakIfAudioAssist && this.audioAssistEnabled()) {
      this.speak(cleaned, { force: false });
      return;
    }

    this.setState({ liveAnnouncement: cleaned });
  }

  /**
   * Stops audio playback and clears the active live caption text.
   */
  dismissCaption(): void {
    this.stopSpeaking();
    this.setState({ liveAnnouncement: '' });
  }

  toggleAudioAssist(): void {
    const next = !this.audioAssistEnabled();
    this.updatePreferences({ audioAssistEnabled: next });
    if (!next) {
      this.stopSpeaking();
    }
  }

  toggleVisualCaptions(): void {
    this.updatePreferences({ visualCaptionsEnabled: !this.visualCaptionsEnabled() });
  }

  toggleHighContrast(): void {
    this.updatePreferences({ highContrast: !this.highContrast() });
  }

  setFontScale(fontScale: FontScale): void {
    this.updatePreferences({ fontScale });
  }

  setSpeechRate(speechRate: SpeechRate): void {
    this.updatePreferences({ speechRate });
  }

  toggleReducedMotion(): void {
    this.updatePreferences({ reducedMotion: !this.reducedMotion() });
  }

  /**
   * Restores all accessibility settings to defaults, stops speech, and clears DOM classes.
   */
  resetPreferences(): void {
    this.stopSpeaking();
    this.setState({
      ...DEFAULT_PREFERENCES,
      liveAnnouncement: '',
    });
    this.preferencesRepo.saveAccessibility(DEFAULT_PREFERENCES);
    this.applyDomClasses(this.state());
  }

  private updatePreferences(partial: Partial<AccessibilityPreferences>): void {
    this.setState(partial);
    const current = this.state();
    const prefs: AccessibilityPreferences = {
      audioAssistEnabled: current.audioAssistEnabled,
      visualCaptionsEnabled: current.visualCaptionsEnabled,
      speechRate: current.speechRate,
      highContrast: current.highContrast,
      fontScale: current.fontScale,
      reducedMotion: current.reducedMotion,
    };
    this.preferencesRepo.saveAccessibility(prefs);
    this.applyDomClasses(current);
  }

  private applyDomClasses(state: AccessibilityState): void {
    const root = this.document?.documentElement;
    if (!root) {
      return;
    }

    root.classList.toggle('app-high-contrast', state.highContrast);
    root.classList.toggle('app-font-large', state.fontScale === 'large');
    root.classList.toggle('app-font-xlarge', state.fontScale === 'xlarge');
    root.classList.toggle('app-reduced-motion', state.reducedMotion);
  }
}
