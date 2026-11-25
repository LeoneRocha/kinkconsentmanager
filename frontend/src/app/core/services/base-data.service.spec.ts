import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PageResult } from '../models';
import { API_BASE_URL, BaseDataService } from './base-data.service';

interface TestPartnerDto {
  readonly id: string;
  readonly name: string;
  readonly normalized?: boolean;
}

@Injectable()
class TestPartnerDataService extends BaseDataService<TestPartnerDto, string> {
  protected override readonly resourcePath = '/partners/';

  protected override getRequestHeaders(): Record<string, string> {
    return { 'X-App-Client': 'kcm-v1' };
  }

  protected override mapItem(raw: unknown): TestPartnerDto {
    const item = raw as TestPartnerDto;
    return { ...item, normalized: true };
  }
}

describe('BaseDataService', () => {
  let service: TestPartnerDataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.com/v1/' },
        TestPartnerDataService,
      ],
    });

    service = TestBed.inject(TestPartnerDataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should execute GET getAll with normalized URL, custom headers, and primitive/array QueryParams', () => {
    let actual: readonly TestPartnerDto[] = [];

    service
      .getAll({ active: true, tag: ['rope', 'impact'], limit: 10 })
      .subscribe((res) => (actual = res));

    const req = httpMock.expectOne(
      (r) =>
        r.method === 'GET' &&
        r.url === 'https://api.example.com/v1/partners' &&
        r.params.get('active') === 'true' &&
        r.params.get('limit') === '10' &&
        r.params.getAll('tag')?.join(',') === 'rope,impact',
    );
    expect(req.request.headers.get('X-App-Client')).toBe('kcm-v1');

    req.flush([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ]);

    expect(actual).toEqual([
      { id: '1', name: 'Alice', normalized: true },
      { id: '2', name: 'Bob', normalized: true },
    ]);
  });

  it('should execute GET getPage with pagination, sorting, and filter params', () => {
    let pageResult: PageResult<TestPartnerDto> | undefined;

    service
      .getPage({
        page: 2,
        pageSize: 15,
        sortBy: 'name',
        sortDirection: 'asc',
        filters: { role: 'dom' },
      })
      .subscribe((res) => (pageResult = res));

    const req = httpMock.expectOne(
      (r) =>
        r.method === 'GET' &&
        r.url === 'https://api.example.com/v1/partners' &&
        r.params.get('page') === '2' &&
        r.params.get('pageSize') === '15' &&
        r.params.get('sortBy') === 'name' &&
        r.params.get('sortDirection') === 'asc' &&
        r.params.get('role') === 'dom',
    );

    req.flush({
      items: [{ id: '3', name: 'Carol' }],
      total: 31,
      page: 2,
      pageSize: 15,
    });

    expect(pageResult).toEqual({
      items: [{ id: '3', name: 'Carol', normalized: true }],
      total: 31,
      page: 2,
      pageSize: 15,
    });
  });

  it('should execute GET getById with URL-encoded identifier', () => {
    let actual: TestPartnerDto | undefined;

    service.getById('user/42').subscribe((res) => (actual = res));

    const req = httpMock.expectOne('https://api.example.com/v1/partners/user%2F42');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'user/42', name: 'Dana' });

    expect(actual).toEqual({ id: 'user/42', name: 'Dana', normalized: true });
  });

  it('should execute POST create, PUT update, PATCH patch, and DELETE delete', () => {
    let created: TestPartnerDto | undefined;
    let updated: TestPartnerDto | undefined;
    let patched: TestPartnerDto | undefined;
    let deleted = false;

    service.create({ name: 'Eve' }).subscribe((res) => (created = res));
    const postReq = httpMock.expectOne('https://api.example.com/v1/partners');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({ name: 'Eve' });
    postReq.flush({ id: '10', name: 'Eve' });
    expect(created).toEqual({ id: '10', name: 'Eve', normalized: true });

    service.update('10', { id: '10', name: 'Eve Updated' }).subscribe((res) => (updated = res));
    const putReq = httpMock.expectOne('https://api.example.com/v1/partners/10');
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({ id: '10', name: 'Eve Updated' });
    expect(updated?.name).toBe('Eve Updated');

    service.patch('10', { name: 'Eve Patched' }).subscribe((res) => (patched = res));
    const patchReq = httpMock.expectOne('https://api.example.com/v1/partners/10');
    expect(patchReq.request.method).toBe('PATCH');
    patchReq.flush({ id: '10', name: 'Eve Patched' });
    expect(patched?.name).toBe('Eve Patched');

    service.delete('10').subscribe(() => (deleted = true));
    const deleteReq = httpMock.expectOne('https://api.example.com/v1/partners/10');
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);
    expect(deleted).toBe(true);
  });
});
