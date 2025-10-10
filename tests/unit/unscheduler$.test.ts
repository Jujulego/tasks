import { unscheduler$, workload$ } from '@/src/index.js';
import { describe, expect, it, vi } from 'vitest';

// Tests
describe('unscheduler$', () => {
  it('should start workload immediately', () => {
    const workload = workload$({ onStart: vi.fn() });
    vi.spyOn(workload, 'start');

    const scheduler = unscheduler$();
    scheduler.register(workload);

    expect(workload.start).toHaveBeenCalled();
  });

  it('should wait workload to be ready before starting it', () => {
    const workload = workload$({ onStart: vi.fn() });
    workload.block();

    vi.spyOn(workload, 'start');

    const scheduler = unscheduler$();
    scheduler.register(workload);

    expect(workload.start).not.toHaveBeenCalled();

    workload.unblock();

    expect(workload.start).toHaveBeenCalled();
  });

  it('should throw when registering a non waiting task', () => {
    const workload = workload$({ onStart: vi.fn() });
    workload.start();

    vi.spyOn(workload, 'start');

    const scheduler = unscheduler$();

    expect(() => scheduler.register(workload)).toThrow(new Error('Cannot schedule a workload in starting state'));

    expect(workload.start).not.toHaveBeenCalled();
  });
});