import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  importProvidersFrom,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';
import {
  BROWSER_STORAGE_REPOSITORY_TOKEN,
  BrowserStorageRepository,
  QUESTION_TRANSLATIONS_REPOSITORY_TOKEN,
  SCHEMA_REPOSITORY_TOKEN,
  StaticJsonQuestionTranslationsRepository,
  StaticJsonSchemaRepository,
  USER_PREFERENCES_REPOSITORY_TOKEN,
  UserPreferencesRepository,
} from './core/repositories';
import {
  API_BASE_URL,
  CompositeTranslateLoader,
  I18nService,
  TelemetryErrorHandler,
  TelemetryService,
  ThemeService,
} from './core/services';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => inject(TelemetryService).initialize()),
    provideAppInitializer(() => {
      inject(ThemeService);
      return inject(I18nService).initialize();
    }),
    { provide: ErrorHandler, useClass: TelemetryErrorHandler },
    provideRouter(routes),
    provideHttpClient(),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    importProvidersFrom(MatDialogModule, MatSnackBarModule),
    provideTranslateService({
      fallbackLang: 'en-US',
      langs: ['pt-BR', 'en-US'],
      loader: provideTranslateLoader(CompositeTranslateLoader),
    }),
    {
      provide: SCHEMA_REPOSITORY_TOKEN,
      useClass: StaticJsonSchemaRepository,
    },
    {
      provide: QUESTION_TRANSLATIONS_REPOSITORY_TOKEN,
      useClass: StaticJsonQuestionTranslationsRepository,
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
