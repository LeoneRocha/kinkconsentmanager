import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { ApiServiceResponse, CloudChecklistDto, UpsertCloudChecklistRequest } from '../models';
import { API_BASE_URL } from './base-data.service';
import { I18nService } from './i18n.service';

/**
 * Serviço HTTP dedicado à persistência 1:1 do checklist on-line em `/api/v1/checklists/current`.
 */
@Injectable({ providedIn: 'root' })
export class ChecklistCloudApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly i18n = inject(I18nService);

  /**
   * Obtém o checklist salvo na conta do usuário autenticado; retorna `null` quando HTTP 404.
   */
  getCurrentChecklist(): Observable<CloudChecklistDto | null> {
    return this.http
      .get<ApiServiceResponse<CloudChecklistDto>>(this.buildCurrentUrl(), {
        headers: this.buildLocaleHeaders(),
      })
      .pipe(
        map((response) => this.unwrapChecklistResponse(response)),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            return of(null);
          }
          return throwError(() => error);
        }),
      );
  }

  /**
   * Cria ou atualiza o checklist único do usuário na tabela `UserKinkCheclists`.
   */
  upsertCurrentChecklist(payload: UpsertCloudChecklistRequest): Observable<CloudChecklistDto> {
    return this.http
      .put<ApiServiceResponse<CloudChecklistDto>>(this.buildCurrentUrl(), payload, {
        headers: this.buildLocaleHeaders(),
      })
      .pipe(map((response) => this.unwrapChecklistResponse(response)));
  }

  /**
   * Exclui de forma idempotente o checklist salvo on-line do usuário autenticado.
   */
  deleteCurrentChecklist(): Observable<boolean> {
    return this.http
      .delete<ApiServiceResponse<boolean>>(this.buildCurrentUrl(), {
        headers: this.buildLocaleHeaders(),
      })
      .pipe(map((response) => Boolean(response?.data ?? true)));
  }

  private buildCurrentUrl(): string {
    const base = this.apiBaseUrl.trim().replace(/\/+$/, '');
    const path = 'api/v1/checklists/current';
    return base ? `${base}/${path}` : `/${path}`;
  }

  private buildLocaleHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Accept-Language': this.i18n.currentLang(),
    });
  }

  private unwrapChecklistResponse(
    response: ApiServiceResponse<CloudChecklistDto>,
  ): CloudChecklistDto {
    if (response && response.data && typeof response.data.answersJson === 'string') {
      return response.data;
    }
    throw new Error('Invalid cloud checklist response payload.');
  }
}
