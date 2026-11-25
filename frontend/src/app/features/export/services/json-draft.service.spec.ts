import { TestBed } from '@angular/core/testing';
import { ChecklistDraft } from '../../../core/models';
import { FileDownloadService } from './file-download.service';
import { JsonDraftService } from './json-draft.service';

describe('JsonDraftService', () => {
  let service: JsonDraftService;
  let fileDownloadMock: {
    downloadBlob: ReturnType<typeof jest.fn>;
    downloadDataUrl: ReturnType<typeof jest.fn>;
  };

  beforeEach(() => {
    fileDownloadMock = {
      downloadBlob: jest.fn(),
      downloadDataUrl: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: FileDownloadService, useValue: fileDownloadMock }],
    });

    service = TestBed.inject(JsonDraftService);
  });

  it('should serialize and download a draft via FileDownloadService', async () => {
    const draft: ChecklistDraft = {
      schemaVersion: '1.0.0',
      exportedAt: '2026-11-22T18:00:00.000Z',
      language: 'en-US',
      answers: {
        item_rope: { primaryScale: 'enjoy', secondaryScale: 'favorite' },
      },
    };

    const result = service.exportDraft(draft, 'backup-draft');

    expect(result).toEqual({
      format: 'json',
      filename: 'backup-draft.json',
      success: true,
    });
    expect(fileDownloadMock.downloadBlob).toHaveBeenCalledTimes(1);

    const [blob, filename] = fileDownloadMock.downloadBlob.mock.calls[0] as [Blob, string];
    expect(filename).toBe('backup-draft.json');
    expect(blob.type).toContain('application/json');
    const serialized = await blob.text();
    expect(JSON.parse(serialized)).toEqual(draft);
  });

  it('should return failure ExportResult if downloadBlob throws', () => {
    fileDownloadMock.downloadBlob.mockImplementationOnce(() => {
      throw new Error('Download disallowed');
    });

    const result = service.exportDraft(
      {
        schemaVersion: '1.0.0',
        exportedAt: '2026-11-22T18:00:00.000Z',
        language: 'pt-BR',
        answers: {},
      },
      'error.json',
    );

    expect(result).toEqual({
      format: 'json',
      filename: 'error.json',
      success: false,
      errorMessage: 'Download disallowed',
    });
  });

  it('should parse and validate a valid JSON draft with matching major schemaVersion', () => {
    const raw = JSON.stringify({
      schemaVersion: '1.3.0',
      exportedAt: '2026-11-22T18:10:00.000Z',
      language: 'en-US',
      answers: {
        item_rope: { primaryScale: 'curious' },
      },
    });

    const result = service.parseAndValidateDraft(raw, '1.0.0');

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.draft).toEqual({
      schemaVersion: '1.3.0',
      exportedAt: '2026-11-22T18:10:00.000Z',
      language: 'en-US',
      answers: {
        item_rope: { primaryScale: 'curious' },
      },
    });
  });

  it('should safely reject malformed JSON syntax without throwing', () => {
    const result = service.parseAndValidateDraft('{broken json', '1.0.0');

    expect(result.valid).toBe(false);
    expect(result.draft).toBeUndefined();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject non-object JSON payloads such as arrays or null', () => {
    expect(service.parseAndValidateDraft('[]', '1.0.0').valid).toBe(false);
    expect(service.parseAndValidateDraft('null', '1.0.0').valid).toBe(false);
  });

  it('should reject incompatible major schema versions', () => {
    const raw = JSON.stringify({
      schemaVersion: '2.0.0',
      exportedAt: '2026-11-22T18:10:00.000Z',
      language: 'pt-BR',
      answers: {},
    });

    const result = service.parseAndValidateDraft(raw, '1.0.0');

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('incompatible'))).toBe(true);
  });

  it('should reject missing exportedAt or non-plain-object answers', () => {
    const badAnswersArray = JSON.stringify({
      schemaVersion: '1.0.0',
      exportedAt: '2026-11-22T18:10:00.000Z',
      answers: [],
    });
    const badAnswersEntry = JSON.stringify({
      schemaVersion: '1.0.0',
      exportedAt: '',
      answers: { item_a: 'invalid-string' },
    });

    expect(service.parseAndValidateDraft(badAnswersArray, '1.0.0').valid).toBe(false);
    const entryResult = service.parseAndValidateDraft(badAnswersEntry, '1.0.0');
    expect(entryResult.valid).toBe(false);
    expect(entryResult.errors.length).toBe(2);
  });

  it('should round-trip a full ChecklistDraft with dual roles, not_applicable, choices, __other__, and text', async () => {
    const draft: ChecklistDraft = {
      schemaVersion: '1.0.0',
      exportedAt: '2026-11-25T13:15:00.000Z',
      language: 'pt-BR',
      answers: {
        item_bondage: { primaryScale: 'not_applicable', secondaryScale: 'favorite' },
        item_safeword: { selectedOption: '__other__', otherText: 'Two taps' },
        item_aftercare: { selectedOptions: ['opt_water', '__other__'], otherText: 'Tea' },
        item_medical: { customText: 'Avoid pressure on knees' },
      },
    };

    const exportResult = service.exportDraft(draft);
    expect(exportResult.success).toBe(true);
    expect(exportResult.filename).toMatch(/^kink-consent-draft-\d{4}-\d{2}-\d{2}\.json$/);

    const [blob] = fileDownloadMock.downloadBlob.mock.calls[0] as [Blob, string];
    const reimported = service.parseAndValidateDraft(await blob.text(), '1.0.0');
    expect(reimported.valid).toBe(true);
    expect(reimported.draft).toEqual(draft);
  });
});
