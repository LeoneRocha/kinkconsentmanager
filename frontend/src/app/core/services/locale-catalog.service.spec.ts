import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { LocaleCatalogService } from './locale-catalog.service';

describe('LocaleCatalogService', () => {
  let service: LocaleCatalogService;
  const originalLanguageDescriptor = Object.getOwnPropertyDescriptor(
    Navigator.prototype,
    'language',
  );
  const originalLanguagesDescriptor = Object.getOwnPropertyDescriptor(
    Navigator.prototype,
    'languages',
  );

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocaleCatalogService);
  });

  afterEach(() => {
    if (originalLanguageDescriptor) {
      Object.defineProperty(Navigator.prototype, 'language', originalLanguageDescriptor);
    }
    if (originalLanguagesDescriptor) {
      Object.defineProperty(Navigator.prototype, 'languages', originalLanguagesDescriptor);
    }
    jest.restoreAllMocks();
  });

  // Cenário: Consulta ao catálogo de idiomas suportados pela aplicação.
  // Objetivo: Garantir que pt-BR e en-US retornem metadados completos em chamadas síncronas e Observable.
  it('should return supported locale metadata lists synchronously and via getFixedLocales()', async () => {
    const syncLocales = service.getFallbackLocales();
    const obsLocales = await firstValueFrom(service.getFixedLocales());

    expect(syncLocales.map((l) => l.code)).toEqual(['pt-BR', 'en-US']);
    expect(obsLocales).toEqual(syncLocales);
    expect(service.getLocaleByCode('pt-BR')?.nativeName).toBe('Português (Brasil)');
    expect(service.getLocaleByCode('en-US')?.short).toBe('EN');
    expect(service.getLocaleByCode('fr-FR')).toBeUndefined();
  });

  // Cenário: Verificação de códigos suportados e detecção automática a partir do idioma do navegador.
  // Objetivo: Resolver prefixos pt/en corretamente e aplicar fallback para pt-BR quando desconhecido.
  it('should validate locale codes and resolve browser preferred locales cleanly', () => {
    expect(service.isSupportedLocale('pt-BR')).toBe(true);
    expect(service.isSupportedLocale('en-US')).toBe(true);
    expect(service.isSupportedLocale('es-ES')).toBe(false);
    expect(service.isSupportedLocale(null)).toBe(false);

    expect(service.resolveBrowserPreferredLocale('en-GB')).toBe('en-US');
    expect(service.resolveBrowserPreferredLocale('pt-PT')).toBe('pt-BR');
    expect(service.resolveBrowserPreferredLocale('de-DE')).toBe('pt-BR');
    expect(service.resolveBrowserPreferredLocale('')).toBe('pt-BR');
    expect(service.resolveBrowserPreferredLocale(['es-ES', 'en-GB', 'pt-BR'])).toBe('en-US');
    expect(service.resolveBrowserPreferredLocale(['fr-FR', 'pt-PT'])).toBe('pt-BR');
  });

  // Cenário: Leitura automática de navigator.languages e fallback para navigator.language.
  // Objetivo: Detectar automaticamente o idioma preferido do navegador no primeiro acesso sem preferência salva.
  it('should auto-detect preferred locale from navigator.languages and fallback to navigator.language', () => {
    Object.defineProperty(Navigator.prototype, 'languages', {
      configurable: true,
      get: () => ['es-ES', 'en-CA'],
    });
    Object.defineProperty(Navigator.prototype, 'language', {
      configurable: true,
      get: () => 'pt-BR',
    });
    expect(service.resolveBrowserPreferredLocale()).toBe('en-US');

    Object.defineProperty(Navigator.prototype, 'languages', {
      configurable: true,
      get: () => [],
    });
    Object.defineProperty(Navigator.prototype, 'language', {
      configurable: true,
      get: () => 'en-GB',
    });
    expect(service.resolveBrowserPreferredLocale()).toBe('en-US');

    Object.defineProperty(Navigator.prototype, 'languages', {
      configurable: true,
      get: () => ['fr-FR', 'pt-PT'],
    });
    Object.defineProperty(Navigator.prototype, 'language', {
      configurable: true,
      get: () => 'en-US',
    });
    expect(service.resolveBrowserPreferredLocale()).toBe('pt-BR');
  });
});
