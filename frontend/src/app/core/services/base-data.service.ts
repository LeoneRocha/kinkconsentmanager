import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { map, Observable } from 'rxjs';
import { EntityId, ICrudOperations, PageRequest, PageResult, QueryParams } from '../models';

/**
 * Configurable base API URL injected into HTTP data services (empty string by default for same-origin/relative calls).
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '',
});

/**
 * Generic HTTP CRUD service base ready to connect any domain resource to a REST API.
 */
export abstract class BaseDataService<
  T,
  TId extends EntityId = string,
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
> implements ICrudOperations<T, TId, TCreate, TUpdate> {
  protected readonly http = inject(HttpClient);
  protected readonly apiBaseUrl = inject(API_BASE_URL);

  protected abstract readonly resourcePath: string;

  /**
   * Fetches all resources matching optional query parameters.
   */
  getAll(params?: QueryParams): Observable<readonly T[]> {
    return this.http
      .get<unknown>(this.buildUrl(), {
        params: this.buildHttpParams(params),
        headers: this.getRequestHeaders(),
      })
      .pipe(map((raw) => this.mapCollection(raw)));
  }

  /**
   * Fetches a paginated list of resources using page, pageSize, sorting, and optional filter parameters.
   */
  getPage(request?: PageRequest): Observable<PageResult<T>> {
    const query: Record<
      string,
      string | number | boolean | readonly (string | number | boolean)[]
    > = {
      ...(request?.filters ?? {}),
    };

    if (request?.page !== undefined) {
      query['page'] = request.page;
    }
    if (request?.pageSize !== undefined) {
      query['pageSize'] = request.pageSize;
    }
    if (request?.sortBy) {
      query['sortBy'] = request.sortBy;
    }
    if (request?.sortDirection) {
      query['sortDirection'] = request.sortDirection;
    }

    return this.http
      .get<unknown>(this.buildUrl(), {
        params: this.buildHttpParams(query),
        headers: this.getRequestHeaders(),
      })
      .pipe(map((raw) => this.mapPageResult(raw, request)));
  }

  /**
   * Fetches a single resource by its identifier.
   */
  getById(id: TId): Observable<T> {
    return this.http
      .get<unknown>(this.buildUrl(id), {
        headers: this.getRequestHeaders(),
      })
      .pipe(map((raw) => this.mapItem(raw)));
  }

  /**
   * Creates a new resource via HTTP POST.
   */
  create(payload: TCreate): Observable<T> {
    return this.http
      .post<unknown>(this.buildUrl(), payload, {
        headers: this.getRequestHeaders(),
      })
      .pipe(map((raw) => this.mapItem(raw)));
  }

  /**
   * Replaces an existing resource via HTTP PUT.
   */
  update(id: TId, payload: TUpdate): Observable<T> {
    return this.http
      .put<unknown>(this.buildUrl(id), payload, {
        headers: this.getRequestHeaders(),
      })
      .pipe(map((raw) => this.mapItem(raw)));
  }

  /**
   * Partially updates an existing resource via HTTP PATCH.
   */
  patch(id: TId, payload: Partial<TUpdate>): Observable<T> {
    return this.http
      .patch<unknown>(this.buildUrl(id), payload, {
        headers: this.getRequestHeaders(),
      })
      .pipe(map((raw) => this.mapItem(raw)));
  }

  /**
   * Deletes a resource by identifier via HTTP DELETE.
   */
  delete(id: TId): Observable<void> {
    return this.http.delete<void>(this.buildUrl(id), {
      headers: this.getRequestHeaders(),
    });
  }

  /**
   * Builds the normalized endpoint URL from `API_BASE_URL`, `resourcePath`, and optional entity ID.
   */
  protected buildUrl(id?: TId): string {
    const rawResource = this.resourcePath.trim();
    let root: string;

    if (/^https?:\/\//i.test(rawResource)) {
      root = rawResource.replace(/\/+$/, '');
    } else {
      const base = this.apiBaseUrl.trim().replace(/\/+$/, '');
      const resource = rawResource.replace(/^\/+|\/+$/g, '');
      if (base) {
        root = resource ? `${base}/${resource}` : base;
      } else {
        root = resource ? `/${resource}` : '';
      }
    }

    if (id === undefined || id === null) {
      return root;
    }

    const encodedId = encodeURIComponent(String(id));
    return root ? `${root}/${encodedId}` : encodedId;
  }

  /**
   * Converts typed query parameters (including primitive arrays) into Angular `HttpParams`.
   */
  protected buildHttpParams(params?: QueryParams): HttpParams {
    let httpParams = new HttpParams();
    if (!params) {
      return httpParams;
    }

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) {
        continue;
      }
      if (Array.isArray(value)) {
        for (const entry of value) {
          httpParams = httpParams.append(key, String(entry));
        }
      } else {
        httpParams = httpParams.set(key, String(value));
      }
    }

    return httpParams;
  }

  /**
   * Hook for subclasses to provide custom request headers (e.g. authorization or content headers).
   */
  protected getRequestHeaders(): HttpHeaders | Record<string, string | string[]> {
    return {};
  }

  /**
   * Hook for subclasses to map or validate a single DTO returned by the API.
   */
  protected mapItem(raw: unknown): T {
    return raw as T;
  }

  /**
   * Hook for subclasses to map or validate a list DTO returned by the API.
   */
  protected mapCollection(raw: unknown): readonly T[] {
    return Array.isArray(raw) ? raw.map((entry) => this.mapItem(entry)) : [];
  }

  private mapPageResult(raw: unknown, request?: PageRequest): PageResult<T> {
    if (Array.isArray(raw)) {
      const items = this.mapCollection(raw);
      return {
        items,
        total: items.length,
        page: request?.page ?? 1,
        pageSize: request?.pageSize ?? items.length,
      };
    }

    const record = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const items = this.mapCollection(record['items']);
    const total = typeof record['total'] === 'number' ? record['total'] : items.length;
    const page = typeof record['page'] === 'number' ? record['page'] : (request?.page ?? 1);
    const pageSize =
      typeof record['pageSize'] === 'number'
        ? record['pageSize']
        : (request?.pageSize ?? items.length);

    return { items, total, page, pageSize };
  }
}
