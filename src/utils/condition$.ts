import { is$, type Observable, pipe$, type Ref, var$, waitFor$ } from 'kyrielle';

/**
 * Tracks status of a "condition", emitting when its result changes
 */
export function condition$(condition: () => boolean): Condition {
  const value = var$(condition());

  return {
    ...value,
    check(): boolean {
      const result = condition();

      if (result !== value.defer()) {
        value.mutate(result);
      }

      return result;
    }
  };
}

export async function waitValue$<T>(origin: Ref<T> & Observable<T>, value: T): Promise<void> {
  if (origin.defer() === value) {
    return;
  }

  await waitFor$(pipe$(origin, is$(value)));
}

// Types
export interface Condition extends Ref<boolean>, Observable<boolean> {
  /**
   * Checks if condition result has changed.
   */
  check(this: void): boolean;
}
