import { InjectionToken } from '@angular/core';
import { EntityId, ICrudOperations } from '../models';

/**
 * Generic CRUD repository contract extending `ICrudOperations` with optional cache invalidation.
 */
export interface ICrudRepository<
  T,
  TId extends EntityId = string,
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
> extends ICrudOperations<T, TId, TCreate, TUpdate> {
  invalidateCache?(): void;
}

/**
 * Factory helper to create typed DI tokens for feature/domain CRUD repositories.
 */
export function createCrudRepositoryToken<
  T,
  TId extends EntityId = string,
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
>(description: string): InjectionToken<ICrudRepository<T, TId, TCreate, TUpdate>> {
  return new InjectionToken<ICrudRepository<T, TId, TCreate, TUpdate>>(description);
}
