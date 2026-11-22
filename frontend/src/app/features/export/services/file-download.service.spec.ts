import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FileDownloadService } from './file-download.service';

describe('FileDownloadService', () => {
  let service: FileDownloadService;
  let doc: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FileDownloadService);
    doc = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create an object URL, click a temporary anchor, remove it, and revoke the URL for downloadBlob', () => {
    const mockUrl = 'blob:http://localhost/mock-123';
    const createObjectUrlSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
    const revokeObjectUrlSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const anchor = doc.createElement('a');
    const clickSpy = jest.spyOn(anchor, 'click').mockImplementation(() => {});
    const removeSpy = jest.spyOn(anchor, 'remove');
    const createElementSpy = jest.spyOn(doc, 'createElement').mockReturnValue(anchor);
    const appendSpy = jest.spyOn(doc.body, 'appendChild');

    const blob = new Blob(['{"ok":true}'], { type: 'application/json' });
    service.downloadBlob(blob, 'draft.json');

    expect(createObjectUrlSpy).toHaveBeenCalledWith(blob);
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(anchor.href).toBe(mockUrl);
    expect(anchor.download).toBe('draft.json');
    expect(appendSpy).toHaveBeenCalledWith(anchor);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith(mockUrl);
  });

  it('should still clean up anchor and revoke object URL even if anchor.click throws', () => {
    const mockUrl = 'blob:http://localhost/fail-456';
    jest.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
    const revokeObjectUrlSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const anchor = doc.createElement('a');
    jest.spyOn(anchor, 'click').mockImplementation(() => {
      throw new Error('Click blocked');
    });
    const removeSpy = jest.spyOn(anchor, 'remove');
    jest.spyOn(doc, 'createElement').mockReturnValue(anchor);

    const blob = new Blob(['hello'], { type: 'text/plain' });
    expect(() => service.downloadBlob(blob, 'test.txt')).toThrow('Click blocked');
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith(mockUrl);
  });

  it('should download a Data URL directly via temporary anchor without calling createObjectURL', () => {
    const createObjectUrlSpy = jest.spyOn(URL, 'createObjectURL');
    const anchor = doc.createElement('a');
    const clickSpy = jest.spyOn(anchor, 'click').mockImplementation(() => {});
    const removeSpy = jest.spyOn(anchor, 'remove');
    jest.spyOn(doc, 'createElement').mockReturnValue(anchor);

    const dataUrl = 'data:image/png;base64,AAAA';
    service.downloadDataUrl(dataUrl, 'preview.png');

    expect(createObjectUrlSpy).not.toHaveBeenCalled();
    expect(anchor.href).toBe(dataUrl);
    expect(anchor.download).toBe('preview.png');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });
});
