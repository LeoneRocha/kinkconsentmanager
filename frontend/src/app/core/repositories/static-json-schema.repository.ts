import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, shareReplay, throwError } from 'rxjs';
import { ChecklistSchema } from '../models';
import { ISchemaRepository } from './schema.repository';

/**
 * Loads static JSON checklist schemas from application assets with per-version in-memory caching.
 */
@Injectable({ providedIn: 'root' })
export class StaticJsonSchemaRepository implements ISchemaRepository {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Observable<ChecklistSchema>>();

  /**
   * Fetches and validates a checklist schema by version, reusing the cached stream on repeat calls.
   */
  getChecklistSchema(version?: string): Observable<ChecklistSchema> {
    const resolvedVersion = version?.trim() || 'v1';
    const cached$ = this.cache.get(resolvedVersion);
    if (cached$) {
      return cached$;
    }

    const request$ = this.http
      .get<unknown>(`assets/schemas/checklist-${resolvedVersion}.json`)
      .pipe(
        map((payload) => this.validateSchema(payload, resolvedVersion)),
        catchError((error: unknown) => {
          // Evict failed requests so callers can retry later.
          this.cache.delete(resolvedVersion);
          return throwError(() => error);
        }),
        shareReplay(1),
      );

    this.cache.set(resolvedVersion, request$);
    return request$;
  }

  private validateSchema(payload: unknown, version: string): ChecklistSchema {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error(
        `Malformed checklist schema for version "${version}": expected a JSON object.`,
      );
    }

    const record = payload as Record<string, unknown>;
    const schemaVersion = record['schemaVersion'];
    const scales = record['scales'];
    const groups = record['groups'];

    if (typeof schemaVersion !== 'string' || schemaVersion.trim().length === 0) {
      throw new Error(
        `Malformed checklist schema for version "${version}": missing or invalid "schemaVersion".`,
      );
    }

    if (!Array.isArray(scales)) {
      throw new Error(
        `Malformed checklist schema for version "${version}": missing or invalid "scales" array.`,
      );
    }

    if (!Array.isArray(groups)) {
      throw new Error(
        `Malformed checklist schema for version "${version}": missing or invalid "groups" array.`,
      );
    }

    return payload as ChecklistSchema;
  }
}
