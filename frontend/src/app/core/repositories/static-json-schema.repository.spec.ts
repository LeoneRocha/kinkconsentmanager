import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChecklistSchema } from '../models';
import { SCHEMA_REPOSITORY_TOKEN } from './schema.repository';
import { StaticJsonSchemaRepository } from './static-json-schema.repository';

const VALID_SCHEMA: ChecklistSchema = {
  schemaVersion: '1.0.0',
  scales: [
    {
      id: 'hard_limit',
      order: 1,
      color: '#d32f2f',
      contrastColor: '#ffffff',
      icon: 'pi pi-ban',
    },
  ],
  groups: [
    {
      id: 'safety',
      order: 1,
      defaultDualRole: false,
      rolePairId: 'general',
      items: [
        {
          id: 'safeword',
          type: 'restricted_text',
          maxLength: 200,
        },
      ],
    },
  ],
};

describe('StaticJsonSchemaRepository', () => {
  let repository: StaticJsonSchemaRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SCHEMA_REPOSITORY_TOKEN, useExisting: StaticJsonSchemaRepository },
      ],
    });

    repository = TestBed.inject(StaticJsonSchemaRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch checklist-v1.json via HttpTestingController and return parsed schema', () => {
    let result: ChecklistSchema | undefined;

    repository.getChecklistSchema().subscribe((schema) => {
      result = schema;
    });

    const req = httpMock.expectOne('assets/schemas/checklist-v1.json');
    expect(req.request.method).toBe('GET');
    req.flush(VALID_SCHEMA);

    expect(result).toEqual(VALID_SCHEMA);
  });

  it('should fetch versioned schema path when explicit version is provided', () => {
    let result: ChecklistSchema | undefined;

    repository.getChecklistSchema('v2').subscribe((schema) => {
      result = schema;
    });

    const req = httpMock.expectOne('assets/schemas/checklist-v2.json');
    expect(req.request.method).toBe('GET');
    req.flush({ ...VALID_SCHEMA, schemaVersion: '2.0.0' });

    expect(result?.schemaVersion).toBe('2.0.0');
  });

  it('should cache schema response on subsequent calls with a single HTTP request', () => {
    const emissions: ChecklistSchema[] = [];

    repository.getChecklistSchema().subscribe((schema) => emissions.push(schema));
    repository.getChecklistSchema('v1').subscribe((schema) => emissions.push(schema));

    const req = httpMock.expectOne('assets/schemas/checklist-v1.json');
    req.flush(VALID_SCHEMA);

    repository.getChecklistSchema('v1').subscribe((schema) => emissions.push(schema));
    httpMock.expectNone('assets/schemas/checklist-v1.json');

    expect(emissions).toHaveLength(3);
    expect(emissions[0]).toEqual(VALID_SCHEMA);
    expect(emissions[1]).toEqual(VALID_SCHEMA);
    expect(emissions[2]).toEqual(VALID_SCHEMA);
  });

  it('should throw descriptive error if schema payload is missing groups', () => {
    let capturedError: Error | undefined;

    repository.getChecklistSchema().subscribe({
      error: (err: Error) => {
        capturedError = err;
      },
    });

    const req = httpMock.expectOne('assets/schemas/checklist-v1.json');
    req.flush({ schemaVersion: '1.0.0', scales: [] });

    expect(capturedError).toBeInstanceOf(Error);
    expect(capturedError?.message).toContain('groups');
  });

  it('should throw descriptive error if schema payload is missing schemaVersion or scales', () => {
    let versionError: Error | undefined;
    repository.getChecklistSchema('v1').subscribe({
      error: (err: Error) => {
        versionError = err;
      },
    });
    httpMock.expectOne('assets/schemas/checklist-v1.json').flush({ scales: [], groups: [] });
    expect(versionError?.message).toContain('schemaVersion');

    let scalesError: Error | undefined;
    repository.getChecklistSchema('v2').subscribe({
      error: (err: Error) => {
        scalesError = err;
      },
    });
    httpMock
      .expectOne('assets/schemas/checklist-v2.json')
      .flush({ schemaVersion: '2.0.0', groups: [] });
    expect(scalesError?.message).toContain('scales');
  });

  it('should throw descriptive error if payload is not a JSON object', () => {
    let capturedError: Error | undefined;

    repository.getChecklistSchema().subscribe({
      error: (err: Error) => {
        capturedError = err;
      },
    });

    httpMock.expectOne('assets/schemas/checklist-v1.json').flush(['invalid']);
    expect(capturedError?.message).toContain('expected a JSON object');
  });

  it('should resolve via SCHEMA_REPOSITORY_TOKEN', () => {
    const tokenInstance = TestBed.inject(SCHEMA_REPOSITORY_TOKEN);
    expect(tokenInstance).toBe(repository);
  });
});
