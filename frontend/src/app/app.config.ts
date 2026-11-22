import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader, TranslateHttpLoader } from '@ngx-translate/http-loader';
import {
  BROWSER_STORAGE_REPOSITORY_TOKEN,
  BrowserStorageRepository,
  SCHEMA_REPOSITORY_TOKEN,
  StaticJsonSchemaRepository,
  USER_PREFERENCES_REPOSITORY_TOKEN,
  UserPreferencesRepository,
} from './core/repositories';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(MatDialogModule, MatSnackBarModule),
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
    {
      provide: BROWSER_STORAGE_REPOSITORY_TOKEN,
      useClass: BrowserStorageRepository,
    },
    {
      provide: USER_PREFERENCES_REPOSITORY_TOKEN,
      useClass: UserPreferencesRepository,
    },
  ],
};
