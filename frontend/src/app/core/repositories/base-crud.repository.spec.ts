import { of, throwError } from 'rxjs';
import { ICrudOperations, PageResult } from '../models';
import { BaseCrudRepository } from './base-crud.repository';
import { createCrudRepositoryToken } from './crud.repository';

interface DemoEntity {
  readonly id: string;
  readonly name: string;
}

class CachedDemoRepository extends BaseCrudRepository<DemoEntity, string> {
  protected override readonly enableCache = true;

  constructor(
    protected override readonly service: ICrudOperations<DemoEntity, string>,
  ) {
    super();
  }

  protected override transformInput<TPayload>(payload: TPayload): TPayload {
    if (payload && typeof payload === 'object' && 'name' in payload) {
      const record = payload as Record<string, unknown>;
      return {
        ...record,
        name: typeof record['name'] === 'string' ? record['name'].trim() : record['name'],
      } as TPayload;
    }
    return payload;
  }

  protected override transformOutput(item: DemoEntity): DemoEntity {
    return { ...item, name: item.name.toUpperCase() };
  }
}

describe('BaseCrudRepository', () => {
  it('should create a typed InjectionToken via createCrudRepositoryToken', () => {
    const token = createCrudRepositoryToken<DemoEntity>('DEMO_REPO');
    expect(token.toString()).toContain('DEMO_REPO');
  });

  it('should delegate CRUD operations to the underlying service and apply caching & invalidation', () => {
    const service: ICrudOperations<DemoEntity, string> = {
      getAll: jest
        .fn()
        .mockReturnValueOnce(of([{ id: '1', name: 'first' }]))
        .mockReturnValueOnce(of([{ id: '1', name: 'filtered' }]))
        .mockReturnValueOnce(of([{ id: '1', name: 'refreshed' }])),
      getById: jest
        .fn()
        .mockReturnValueOnce(of({ id: '1', name: 'first' }))
        .mockReturnValueOnce(of({ id: '1', name: 'after-update' })),
      create: jest.fn((payload) => of({ id: '2', name: payload.name ?? '' })),
      update: jest.fn((id, payload) => of({ id, name: payload.name ?? '' })),
      patch: jest.fn((id, payload) => of({ id, name: payload.name ?? '' })),
      delete: jest.fn().mockReturnValue(of(void 0)),
    };

    const repo = new CachedDemoRepository(service);

    // Unfiltered getAll caches on repeat subscription
    let list: readonly DemoEntity[] = [];
    repo.getAll().subscribe((res) => (list = res));
    repo.getAll().subscribe((res) => (list = res));
    expect(service.getAll).toHaveBeenCalledTimes(1);
    expect(list).toEqual([{ id: '1', name: 'FIRST' }]);

    // Filtered getAll bypasses cache
    repo.getAll({ active: true }).subscribe((res) => (list = res));
    expect(service.getAll).toHaveBeenCalledTimes(2);
    expect(list).toEqual([{ id: '1', name: 'FILTERED' }]);

    // getById caches per entity id
    let entity: DemoEntity | undefined;
    repo.getById('1').subscribe((res) => (entity = res));
    repo.getById('1').subscribe((res) => (entity = res));
    expect(service.getById).toHaveBeenCalledTimes(1);
    expect(entity).toEqual({ id: '1', name: 'FIRST' });

    // Mutation transforms input and invalidates cache
    repo.update('1', { name: '  updated  ' }).subscribe((res) => (entity = res));
    expect(service.update).toHaveBeenCalledWith('1', { name: 'updated' });
    expect(entity).toEqual({ id: '1', name: 'UPDATED' });

    repo.getById('1').subscribe((res) => (entity = res));
    expect(service.getById).toHaveBeenCalledTimes(2);
    expect(entity).toEqual({ id: '1', name: 'AFTER-UPDATE' });

    repo.getAll().subscribe((res) => (list = res));
    expect(service.getAll).toHaveBeenCalledTimes(3);
    expect(list).toEqual([{ id: '1', name: 'REFRESHED' }]);

    // create, patch, and delete also invalidate cache
    repo.create({ name: '  new item  ' }).subscribe((res) => (entity = res));
    expect(service.create).toHaveBeenCalledWith({ name: 'new item' });
    expect(entity).toEqual({ id: '2', name: 'NEW ITEM' });

    repo.patch('2', { name: '  patched  ' }).subscribe((res) => (entity = res));
    expect(service.patch).toHaveBeenCalledWith('2', { name: 'patched' });
    expect(entity).toEqual({ id: '2', name: 'PATCHED' });

    let deleted = false;
    repo.delete('2').subscribe(() => (deleted = true));
    expect(service.delete).toHaveBeenCalledWith('2');
    expect(deleted).toBe(true);
  });

  it('should evict failed getById and getAll observables from cache so callers can retry', () => {
    const service: ICrudOperations<DemoEntity, string> = {
      getAll: jest
        .fn()
        .mockReturnValueOnce(throwError(() => new Error('Network down')))
        .mockReturnValueOnce(of([{ id: '1', name: 'recovered' }])),
      getById: jest
        .fn()
        .mockReturnValueOnce(throwError(() => new Error('Timeout')))
        .mockReturnValueOnce(of({ id: '1', name: 'recovered-item' })),
      create: jest.fn(),
      update: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    };

    const repo = new CachedDemoRepository(service);

    let errCount = 0;
    repo.getAll().subscribe({ error: () => (errCount += 1) });
    expect(errCount).toBe(1);

    let list: readonly DemoEntity[] = [];
    repo.getAll().subscribe((res) => (list = res));
    expect(list).toEqual([{ id: '1', name: 'RECOVERED' }]);

    repo.getById('1').subscribe({ error: () => (errCount += 1) });
    expect(errCount).toBe(2);

    let item: DemoEntity | undefined;
    repo.getById('1').subscribe((res) => (item = res));
    expect(item).toEqual({ id: '1', name: 'RECOVERED-ITEM' });
  });

  it('should delegate getPage when implemented on service or fallback to paginated getAll', () => {
    const serviceWithPage: ICrudOperations<DemoEntity, string> = {
      getAll: jest.fn(),
      getPage: jest.fn().mockReturnValue(
        of({ items: [{ id: '1', name: 'paged' }], total: 10, page: 2, pageSize: 1 }),
      ),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    };

    const repoWithPage = new CachedDemoRepository(serviceWithPage);
    let page: PageResult<DemoEntity> | undefined;
    repoWithPage.getPage({ page: 2, pageSize: 1 }).subscribe((res) => (page = res));
    expect(serviceWithPage.getPage).toHaveBeenCalledWith({ page: 2, pageSize: 1 });
    expect(page?.items).toEqual([{ id: '1', name: 'PAGED' }]);

    const serviceWithoutPage: ICrudOperations<DemoEntity, string> = {
      getAll: jest.fn().mockReturnValue(
        of([
          { id: '1', name: 'a' },
          { id: '2', name: 'b' },
          { id: '3', name: 'c' },
        ]),
      ),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    };

    const repoWithoutPage = new CachedDemoRepository(serviceWithoutPage);
    repoWithoutPage.getPage({ page: 2, pageSize: 2 }).subscribe((res) => (page = res));
    expect(page).toEqual({
      items: [{ id: '3', name: 'C' }],
      total: 3,
      page: 2,
      pageSize: 2,
    });
  });
});
