import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScaleOption } from '../../../core/models';
import { LegendBarComponent } from './legend-bar.component';

const UNORDERED_SCALES: readonly ScaleOption[] = [
  {
    id: 'favorite',
    order: 5,
    color: '#7B1FA2',
    contrastColor: '#FFFFFF',
    icon: 'pi pi-heart-fill',
  },
  {
    id: 'hard_limit',
    order: 1,
    color: '#D32F2F',
    contrastColor: '#FFFFFF',
    icon: 'pi pi-ban',
  },
  {
    id: 'curious',
    order: 3,
    color: '#FBC02D',
    contrastColor: '#111827',
    icon: 'pi pi-question-circle',
  },
  {
    id: 'soft_limit',
    order: 2,
    color: '#F57C00',
    contrastColor: '#111827',
    icon: 'pi pi-exclamation-triangle',
  },
  {
    id: 'enjoy',
    order: 4,
    color: '#388E3C',
    contrastColor: '#FFFFFF',
    icon: 'pi pi-thumbs-up',
  },
];

const SCALE_LABELS: Readonly<Record<string, string>> = {
  hard_limit: 'Hard Limit',
  soft_limit: 'Soft Limit',
  curious: 'Curious',
  enjoy: 'Enjoy',
  favorite: 'Favorite',
};

describe('LegendBarComponent', () => {
  let fixture: ComponentFixture<LegendBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LegendBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LegendBarComponent);
    fixture.componentRef.setInput('scales', UNORDERED_SCALES);
    fixture.componentRef.setInput('scaleLabels', SCALE_LABELS);
    await fixture.whenStable();
  });

  it('should render all 5 scales in order with icons, colors, and labels', () => {
    const items = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLLIElement>(
      '.legend-bar__item',
    );
    expect(items.length).toBe(5);

    const expectedOrder = [
      { id: 'hard_limit', label: 'Hard Limit', icon: 'pi-ban' },
      { id: 'soft_limit', label: 'Soft Limit', icon: 'pi-exclamation-triangle' },
      { id: 'curious', label: 'Curious', icon: 'pi-question-circle' },
      { id: 'enjoy', label: 'Enjoy', icon: 'pi-thumbs-up' },
      { id: 'favorite', label: 'Favorite', icon: 'pi-heart-fill' },
    ];

    expectedOrder.forEach((expected, index) => {
      const item = items[index];
      const iconEl = item.querySelector('i');
      const labelEl = item.querySelector('.legend-bar__label');
      const chipEl = item.querySelector<HTMLElement>('.legend-bar__chip');

      expect(iconEl?.classList.contains('pi')).toBe(true);
      expect(iconEl?.classList.contains(expected.icon)).toBe(true);
      expect(labelEl?.textContent?.trim()).toBe(expected.label);
      expect(chipEl?.style.backgroundColor).not.toBe('');
    });
  });

  it('should fall back to scale id when label is missing', async () => {
    fixture.componentRef.setInput('scaleLabels', {});
    await fixture.whenStable();

    const labels = (fixture.nativeElement as HTMLElement).querySelectorAll('.legend-bar__label');
    expect(labels[0].textContent?.trim()).toBe('hard_limit');
  });
});
