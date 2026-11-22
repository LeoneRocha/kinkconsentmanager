import { computed, Signal, signal, WritableSignal } from '@angular/core';

/**
 * Reusable signal-backed state container providing immutable updates and reactive property selectors.
 */
export abstract class BaseStateService<T extends object> {
  protected readonly stateSignal: WritableSignal<T>;
  readonly state: Signal<T>;

  protected constructor(initialState: T) {
    this.stateSignal = signal(initialState);
    this.state = this.stateSignal.asReadonly();
  }

  /**
   * Returns a computed signal that tracks a single top-level slice of state.
   */
  select<K extends keyof T>(key: K): Signal<T[K]> {
    return computed(() => this.stateSignal()[key]);
  }

  /**
   * Immutably merges a partial update into the current state.
   */
  protected setState(partial: Partial<T>): void {
    this.stateSignal.update((current) => ({ ...current, ...partial }));
  }

  /**
   * Replaces the entire state with the provided initial snapshot.
   */
  protected resetState(initialState: T): void {
    this.stateSignal.set(initialState);
  }
}
