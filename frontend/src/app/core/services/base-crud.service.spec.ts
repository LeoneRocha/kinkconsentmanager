import { of } from 'rxjs';
import { ICrudOperations, PageResult } from '../models';
import { BaseCrudService } from './base-crud.service';

interface SampleItem {
  readonly id: string;
  readonly label: string;
}

class SampleCrudService extends BaseCrudService<SampleItem, string> {
  constructor(
    protected override readonly source: ICrudOperations<SampleItem, string>,
  ) {
    super();
  }

  protected override beforeCreate(payload: Partial<SampleItem>): Partial<SampleItem> {
    return { ...payload, label: (payload.label ?? '').trim() };
  }

  protected override beforeUpdate(_id: string, payload: Partial<SampleItem>): Partial<SampleItem> {
    return { ...payload, label: `[U] ${payload.label ?? ''}` };
  }

  protected override beforePatch(
    _id: string,
    payload: Partial<Partial<SampleItem>>,
  ): Partial<Partial<SampleItem>> {
    return { ...payload, label: `[P] ${payload.label ?? ''}` };
  }

  protected override afterLoadItem(item: SampleItem): SampleItem {
    return { ...item, label: item.label.toUpperCase() };
  }

  protected override afterLoadList(items: readonly SampleItem[]): readonly SampleItem[] {
    return items.map((item) => this.afterLoadItem(item));
  }
}

describe('BaseCrudService', () => {
  it('should delegate CRUD methods to source and apply lifecycle hooks', () => {
    const source: ICrudOperations<SampleItem, string> = {
      getAll: vi.fn().mockReturnValue(of([{ id: '1', label: 'alpha' }])),
      getPage: vi.fn().mockReturnValue(
        of({ items: [{ id: '1', label: 'alpha' }], total: 1, page: 1, pageSize: 10 }),
      ),
      getById: vi.fn().mockReturnValue(of({ id: '1', label: 'alpha' })),
      create: vi.fn((payload) => of({ id: '2', label: payload.label ?? '' })),
      update: vi.fn((id, payload) => of({ id, label: payload.label ?? '' })),
      patch: vi.fn((id, payload) => of({ id, label: payload.label ?? '' })),
      delete: vi.fn().mockReturnValue(of(void 0)),
    };

    const service = new SampleCrudService(source);

    let list: readonly SampleItem[] = [];
    service.getAll({ q: 'a' }).subscribe((res) => (list = res));
    expect(source.getAll).toHaveBeenCalledWith({ q: 'a' });
    expect(list).toEqual([{ id: '1', label: 'ALPHA' }]);

    let page: PageResult<SampleItem> | undefined;
    service.getPage({ page: 1, pageSize: 10 }).subscribe((res) => (page = res));
    expect(source.getPage).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
    expect(page?.items).toEqual([{ id: '1', label: 'ALPHA' }]);

    let item: SampleItem | undefined;
    service.getById('1').subscribe((res) => (item = res));
    expect(item).toEqual({ id: '1', label: 'ALPHA' });

    service.create({ label: '  beta  ' }).subscribe((res) => (item = res));
    expect(source.create).toHaveBeenCalledWith({ label: 'beta' });
    expect(item).toEqual({ id: '2', label: 'BETA' });

    service.update('2', { label: 'gamma' }).subscribe((res) => (item = res));
    expect(source.update).toHaveBeenCalledWith('2', { label: '[U] gamma' });
    expect(item).toEqual({ id: '2', label: '[U] GAMMA' });

    service.patch('2', { label: 'delta' }).subscribe((res) => (item = res));
    expect(source.patch).toHaveBeenCalledWith('2', { label: '[P] delta' });
    expect(item).toEqual({ id: '2', label: '[P] DELTA' });

    let deleted = false;
    service.delete('2').subscribe(() => (deleted = true));
    expect(source.delete).toHaveBeenCalledWith('2');
    expect(deleted).toBe(true);
  });

  it('should fallback to client-side pagination over getAll when source.getPage is omitted', () => {
    const source: ICrudOperations<SampleItem, string> = {
      getAll: vi.fn().mockReturnValue(
        of([
          { id: '1', label: 'one' },
          { id: '2', label: 'two' },
          { id: '3', label: 'three' },
        ]),
      ),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const service = new SampleCrudService(source);
    let page: PageResult<SampleItem> | undefined;

    service
      .getPage({ page: 2, pageSize: 2, filters: { active: true } })
      .subscribe((res) => (page = res));

    expect(source.getAll).toHaveBeenCalledWith({ active: true });
    expect(page).toEqual({
      items: [{ id: '3', label: 'THREE' }],
      total: 3,
      page: 2,
      pageSize: 2,
    });
  });
});
