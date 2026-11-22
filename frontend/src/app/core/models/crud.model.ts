import { Observable } from 'rxjs';

export type EntityId = string | number;

export type QueryParamPrimitive = string | number | boolean;

export type QueryParams = Readonly<
  Record<string, QueryParamPrimitive | readonly QueryParamPrimitive[]>
>;

export interface PageRequest {
  readonly page?: number;
  readonly pageSize?: number;
  readonly sortBy?: string;
  readonly sortDirection?: 'asc' | 'desc';
  readonly filters?: QueryParams;
}

export interface PageResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

/**
 * Unified generic CRUD contract shared across HTTP data services, domain services, and repositories.
 */
export interface ICrudOperations<
  T,
  TId extends EntityId = string,
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
> {
  getAll(params?: QueryParams): Observable<readonly T[]>;
  getPage?(request?: PageRequest): Observable<PageResult<T>>;
  getById(id: TId): Observable<T>;
  create(payload: TCreate): Observable<T>;
  update(id: TId, payload: TUpdate): Observable<T>;
  patch(id: TId, payload: Partial<TUpdate>): Observable<T>;
  delete(id: TId): Observable<void>;
}
