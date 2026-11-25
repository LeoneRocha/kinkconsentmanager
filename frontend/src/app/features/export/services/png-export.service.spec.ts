import { TestBed } from '@angular/core/testing';
import { FileDownloadService } from './file-download.service';
import { PNG_RENDERER, PngExportService } from './png-export.service';

describe('PngExportService', () => {
  let service: PngExportService;
  let rendererMock: jest.Mock<Promise<string>, [HTMLElement]>;
  let fileDownloadMock: { downloadDataUrl: jest.Mock; downloadBlob: jest.Mock };

  beforeEach(() => {
    rendererMock = jest
      .fn<Promise<string>, [HTMLElement]>()
      .mockResolvedValue('data:image/png;base64,MOCKPNG');
    fileDownloadMock = {
      downloadDataUrl: jest.fn(),
      downloadBlob: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: PNG_RENDERER, useValue: rendererMock },
        { provide: FileDownloadService, useValue: fileDownloadMock },
      ],
    });

    service = TestBed.inject(PngExportService);
  });

  it('should render the target element and trigger download with custom filename', async () => {
    const el = document.createElement('div');
    const result = await service.exportElementAsPng(el, 'my-checklist');

    expect(rendererMock).toHaveBeenCalledWith(el);
    expect(fileDownloadMock.downloadDataUrl).toHaveBeenCalledWith(
      'data:image/png;base64,MOCKPNG',
      'my-checklist.png',
    );
    expect(result).toEqual({
      format: 'png',
      filename: 'my-checklist.png',
      success: true,
    });
  });

  it('should use a default dated .png filename when filename is omitted', async () => {
    const el = document.createElement('div');
    const result = await service.exportElementAsPng(el);

    expect(result.success).toBe(true);
    expect(result.filename).toMatch(/^kink-consent-checklist-\d{4}-\d{2}-\d{2}\.png$/);
    expect(fileDownloadMock.downloadDataUrl).toHaveBeenCalledWith(
      'data:image/png;base64,MOCKPNG',
      result.filename,
    );
  });

  it('should return a failure ExportResult when the PNG renderer rejects', async () => {
    rendererMock.mockRejectedValueOnce(new Error('Canvas tainted'));
    const el = document.createElement('div');

    const result = await service.exportElementAsPng(el, 'broken.png');

    expect(fileDownloadMock.downloadDataUrl).not.toHaveBeenCalled();
    expect(result).toEqual({
      format: 'png',
      filename: 'broken.png',
      success: false,
      errorMessage: 'Canvas tainted',
    });
  });

  it('should return a failure ExportResult when renderer resolves an empty string', async () => {
    rendererMock.mockResolvedValueOnce('');
    const el = document.createElement('div');

    const result = await service.exportElementAsPng(el, 'empty.png');

    expect(fileDownloadMock.downloadDataUrl).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('empty');
  });

  it('should return a failure ExportResult when element is missing', async () => {
    const result = await service.exportElementAsPng(null as unknown as HTMLElement, 'missing.png');

    expect(rendererMock).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.filename).toBe('missing.png');
  });
});
