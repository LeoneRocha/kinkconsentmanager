import { BaseStateService } from './base-state.service';

interface CounterState {
  readonly count: number;
  readonly label: string;
  readonly active: boolean;
}

const INITIAL_COUNTER_STATE: CounterState = {
  count: 0,
  label: 'initial',
  active: false,
};

class TestCounterStateService extends BaseStateService<CounterState> {
  constructor() {
    super(INITIAL_COUNTER_STATE);
  }

  updateCount(count: number): void {
    this.setState({ count });
  }

  updateLabel(label: string): void {
    this.setState({ label });
  }

  reset(): void {
    this.resetState(INITIAL_COUNTER_STATE);
  }
}

describe('BaseStateService', () => {
  let service: TestCounterStateService;

  beforeEach(() => {
    service = new TestCounterStateService();
  });

  it('should expose initial state via readonly state signal', () => {
    expect(service.state()).toEqual(INITIAL_COUNTER_STATE);
  });

  it('should select individual state properties reactively', () => {
    const countSignal = service.select('count');
    const labelSignal = service.select('label');

    expect(countSignal()).toBe(0);
    expect(labelSignal()).toBe('initial');

    service.updateCount(42);
    expect(countSignal()).toBe(42);
    expect(labelSignal()).toBe('initial');
  });

  it('should update state immutably without mutating previous snapshots', () => {
    const firstSnapshot = service.state();
    service.updateLabel('updated');
    const secondSnapshot = service.state();

    expect(secondSnapshot).not.toBe(firstSnapshot);
    expect(firstSnapshot.label).toBe('initial');
    expect(secondSnapshot.label).toBe('updated');
    expect(secondSnapshot.count).toBe(0);
    expect(secondSnapshot.active).toBe(false);
  });

  it('should restore initial state on resetState()', () => {
    service.updateCount(10);
    service.updateLabel('changed');
    expect(service.state()).toEqual({ count: 10, label: 'changed', active: false });

    service.reset();
    expect(service.state()).toEqual(INITIAL_COUNTER_STATE);
  });
});
