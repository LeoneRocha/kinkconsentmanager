import { map, Observable } from 'rxjs';
import {
  EntityId,
  ICrudOperations,
  PageRequest,
  PageResult,
  QueryParams,
} from '../models';

/**
 * Generic application/domain CRUD service delegating to any `ICrudOperations` source (HTTP data service,
 * repository, or external integration service) with extensible before/after lifecycle hooks.
 */
export abstract class BaseCrudService<
  T,
  TId extends EntityId = string,
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
> implements ICrudOperations<T, TId, TCreate, TUpdate> {
  protected abstract readonly source: ICrudOperations<T, TId, TCreate, TUpdate>;

  getAll(params?: QueryParams): Observable<readonly T[]> {
    return this.source.getAll(params).pipe(map((items) => this.afterLoadList(items)));
  }

  getPage(request?: PageRequest): Observable<PageResult<T>> {
    if (typeof this.source.getPage === 'function') {
      return this.source.getPage(request).pipe(
        map((result) => ({
          ...result,
          items: this.afterLoadList(result.items),
        })),
      );
    }

    return this.source.getAll(request?.filters).pipe(
      map((items) => {
        const transformed = this.afterLoadList(items);
        const page = Math.max(1, request?.page ?? 1);
        const pageSize = Math.max(1, request?.pageSize ?? (transformed.length || 20));
        const start = (page - 1) * pageSize;

        return {
          items: transformed.slice(start, start + pageSize),
          total: transformed.length,
          page,
          pageSize,
        };
      }),
    );
  }

  getById(id: TId): Observable<T> {
    return this.source.getById(id).pipe(map((item) => this.afterLoadItem(item)));
  }

  create(payload: TCreate): Observable<T> {
    const prepared = this.beforeCreate(payload);
    return this.source.create(prepared).pipe(map((item) => this.afterLoadItem(item)));
  }

  update(id: TId, payload: TUpdate): Observable<T> {
    const prepared = this.beforeUpdate(id, payload);
    return this.source.update(id, prepared).pipe(map((item) => this.afterLoadItem(item)));
  }

  patch(id: TId, payload: Partial<TUpdate>): Observable<T> {
    const prepared = this.beforePatch(id, payload);
    return this.source.patch(id, prepared).pipe(map((item) => this.afterLoadItem(item)));
  }

  delete(id: TId): Observable<void> {
    return this.source.delete(id);
  }

  protected beforeCreate(payload: TCreate): TCreate {
    return payload;
  }

  protected beforeUpdate(_id: TId, payload: TUpdate): TUpdate {
    return payload;
  }

  protected beforePatch(_id: TId, payload: Partial<TUpdate>): Partial<TUpdate> {
    return payload;
  }

  protected afterLoadItem(item: T): T {
    return item;
  }

  protected afterLoadList(items: readonly T[]): readonly T[] {
    return items;
  }
}
