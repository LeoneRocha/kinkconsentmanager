import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import Aura from '@primeuix/themes/aura';
import { provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader, TranslateHttpLoader } from '@ngx-translate/http-loader';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { SCHEMA_REPOSITORY_TOKEN, StaticJsonSchemaRepository } from './core/repositories';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.kcm-dark-disabled',
        },
      },
    }),
    provideTranslateService({
      lang: 'pt-BR',
      fallbackLang: 'en-US',
      langs: ['pt-BR', 'en-US'],
      loader: provideTranslateLoader(TranslateHttpLoader),
    }),
    provideTranslateHttpLoader({
      prefix: './assets/i18n/',
      suffix: '.json',
    }),
    {
      provide: SCHEMA_REPOSITORY_TOKEN,
      useClass: StaticJsonSchemaRepository,
    },
    ConfirmationService,
    MessageService,
  ],
};
