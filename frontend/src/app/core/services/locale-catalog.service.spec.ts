import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { LocaleCatalogService } from './locale-catalog.service';

describe('LocaleCatalogService', () => {
  let service: LocaleCatalogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocaleCatalogService);
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
  });
});
