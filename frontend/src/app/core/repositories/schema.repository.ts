import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { ChecklistSchema } from '../models';

/**
 * Contract for loading checklist schemas regardless of underlying source.
 */
export interface ISchemaRepository {
  getChecklistSchema(version?: string): Observable<ChecklistSchema>;
}

/**
 * Injection token decoupling consumers from concrete schema repository implementations.
 */
export const SCHEMA_REPOSITORY_TOKEN = new InjectionToken<ISchemaRepository>(
  'ISchemaRepository',
);
