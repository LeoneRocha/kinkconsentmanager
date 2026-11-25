import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { I18nService } from '../../core/services';
import { SchemaTranslatePipe } from './schema-translate.pipe';

@Component({
  standalone: true,
  imports: [SchemaTranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span data-testid="ui">{{ 'save' | schemaTranslate: 'ui' }}</span>
    <span data-testid="scale">{{ 'enjoy' | schemaTranslate: 'scale' }}</span>
    <span data-testid="groupTitle">{{ 'bondage' | schemaTranslate: 'groupTitle' }}</span>
    <span data-testid="groupDesc">{{ 'bondage' | schemaTranslate: 'groupDesc' }}</span>
    <span data-testid="itemLabel">{{ 'rope' | schemaTranslate: 'itemLabel' }}</span>
    <span data-testid="itemTooltip">{{ 'rope' | schemaTranslate: 'itemTooltip' }}</span>
    <span data-testid="option">{{ 'cotton' | schemaTranslate: 'option' }}</span>
  `,
})
class PipeHostTestComponent {
  readonly i18n = inject(I18nService);
}

describe('SchemaTranslatePipe', () => {
  let translateService: TranslateService;
  let i18nService: I18nService;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [PipeHostTestComponent],
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    }).compileComponents();

    translateService = TestBed.inject(TranslateService);
    translateService.setTranslation('pt-BR', {
      ui: { save: 'Salvar' },
      scales: { enjoy: 'Gosto' },
      groups: { bondage: { title: 'Bondage PT', description: 'Descrição PT' } },
      items: { rope: { label: 'Cordas', tooltip: 'Dica Cordas' } },
      options: { cotton: 'Algodão' },
    });
    translateService.setTranslation('en-US', {
      ui: { save: 'Save' },
      scales: { enjoy: 'Enjoy' },
      groups: { bondage: { title: 'Bondage EN', description: 'Description EN' } },
      items: { rope: { label: 'Ropes', tooltip: 'Ropes Tip' } },
      options: { cotton: 'Cotton' },
    });

    i18nService = TestBed.inject(I18nService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should translate every category accurately and reactively update on language change under OnPush', async () => {
    const fixture = TestBed.createComponent(PipeHostTestComponent);
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const readText = (testId: string): string | null =>
      hostEl.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim() ?? null;

    expect(readText('ui')).toBe('Salvar');
    expect(readText('scale')).toBe('Gosto');
    expect(readText('groupTitle')).toBe('Bondage PT');
    expect(readText('groupDesc')).toBe('Descrição PT');
    expect(readText('itemLabel')).toBe('Cordas');
    expect(readText('itemTooltip')).toBe('Dica Cordas');
    expect(readText('option')).toBe('Algodão');

    i18nService.setLanguage('en-US');
    await fixture.whenStable();

    expect(readText('ui')).toBe('Save');
    expect(readText('scale')).toBe('Enjoy');
    expect(readText('groupTitle')).toBe('Bondage EN');
    expect(readText('groupDesc')).toBe('Description EN');
    expect(readText('itemLabel')).toBe('Ropes');
    expect(readText('itemTooltip')).toBe('Ropes Tip');
    expect(readText('option')).toBe('Cotton');
  });

  it('should return empty string for empty id and interpolate UI params', () => {
    const pipe = TestBed.runInInjectionContext(() => new SchemaTranslatePipe());
    translateService.setTranslation('pt-BR', { ui: { hello: 'Olá {{user}}' } }, true);

    expect(pipe.transform('', 'itemLabel')).toBe('');
    expect(pipe.transform('hello', 'ui', { user: 'Sam' })).toBe('Olá Sam');
    expect(pipe.transform('missing', 'itemTooltip')).toBe('');
  });
});
