import { catchError, map, Observable, shareReplay, tap, throwError } from 'rxjs';
import { EntityId, ICrudOperations, PageRequest, PageResult, QueryParams } from '../models';
import { ICrudRepository } from './crud.repository';

/**
 * Generic CRUD repository delegating persistence/API calls to an underlying service (`BaseDataService`,
 * `BaseCrudService`, or any `ICrudOperations` provider), with optional in-memory read caching and automatic
 * cache invalidation on mutations.
 */
export abstract class BaseCrudRepository<
  T,
  TId extends EntityId = string,
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
> implements ICrudRepository<T, TId, TCreate, TUpdate> {
  protected abstract readonly service: ICrudOperations<T, TId, TCreate, TUpdate>;
  protected readonly enableCache: boolean = false;

  private readonly itemCache = new Map<TId, Observable<T>>();
  private allCache$: Observable<readonly T[]> | null = null;

  getAll(params?: QueryParams): Observable<readonly T[]> {
    const canUseCache = this.enableCache && !params;
    if (canUseCache && this.allCache$) {
      return this.allCache$;
    }

    const base$ = this.service.getAll(params).pipe(
      map((items) => items.map((item) => this.transformOutput(item))),
      catchError((error: unknown) => {
        if (canUseCache) {
          this.allCache$ = null;
        }
        return throwError(() => error);
      }),
    );

    if (canUseCache) {
      const cached$ = base$.pipe(shareReplay(1));
      this.allCache$ = cached$;
      return cached$;
    }

    return base$;
  }

  getPage(request?: PageRequest): Observable<PageResult<T>> {
    if (typeof this.service.getPage === 'function') {
      return this.service.getPage(request).pipe(
        map((result) => ({
          ...result,
          items: result.items.map((item) => this.transformOutput(item)),
        })),
      );
    }

    return this.getAll(request?.filters).pipe(
      map((items) => {
        const page = Math.max(1, request?.page ?? 1);
        const pageSize = Math.max(1, request?.pageSize ?? (items.length || 20));
        const start = (page - 1) * pageSize;
        return {
          items: items.slice(start, start + pageSize),
          total: items.length,
          page,
          pageSize,
        };
      }),
    );
  }

  getById(id: TId): Observable<T> {
    if (this.enableCache) {
      const existing$ = this.itemCache.get(id);
      if (existing$) {
        return existing$;
      }
    }

    const base$ = this.service.getById(id).pipe(
      map((item) => this.transformOutput(item)),
      catchError((error: unknown) => {
        if (this.enableCache) {
          this.itemCache.delete(id);
        }
        return throwError(() => error);
      }),
    );

    if (this.enableCache) {
      const cached$ = base$.pipe(shareReplay(1));
      this.itemCache.set(id, cached$);
      return cached$;
    }

    return base$;
  }

  create(payload: TCreate): Observable<T> {
    const transformed = this.transformInput(payload);
    return this.service.create(transformed).pipe(
      tap(() => this.invalidateCache()),
      map((item) => this.transformOutput(item)),
    );
  }

  update(id: TId, payload: TUpdate): Observable<T> {
    const transformed = this.transformInput(payload);
    return this.service.update(id, transformed).pipe(
      tap(() => this.invalidateCache()),
      map((item) => this.transformOutput(item)),
    );
  }

  patch(id: TId, payload: Partial<TUpdate>): Observable<T> {
    const transformed = this.transformInput(payload);
    return this.service.patch(id, transformed).pipe(
      tap(() => this.invalidateCache()),
      map((item) => this.transformOutput(item)),
    );
  }

  delete(id: TId): Observable<void> {
    return this.service.delete(id).pipe(tap(() => this.invalidateCache()));
  }

  /**
   * Clears all cached list and per-entity observables.
   */
  invalidateCache(): void {
    this.allCache$ = null;
    this.itemCache.clear();
  }

  protected transformInput<TPayload>(payload: TPayload): TPayload {
    return payload;
  }

  protected transformOutput(item: T): T {
    return item;
  }
}
