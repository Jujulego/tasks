import { scheduler$, workload$ } from '@/src/index.js';
import { describe, expect, it, vi } from 'vitest';

describe('scheduler$', () => {
  it('should register and immediately start the given workload', () => {
    const workload = workload$({ onStart: vi.fn() });
    const scheduler = scheduler$();

    vi.spyOn(workload, 'start').mockResolvedValue();

    scheduler.register(workload);

    expect(workload.start).toHaveBeenCalledExactlyOnceWith();
  });
});