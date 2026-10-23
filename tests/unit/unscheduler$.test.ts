import { unscheduler$, workload$ } from '@/src/index.js';
import { describe, expect, it, vi } from 'vitest';

// Tests
describe('unscheduler$', () => {
  it('should start workload immediately', () => {
    const workload = workload$({ label: 'test', type: 'test', onStart: vi.fn() });
    vi.spyOn(workload, 'start');

    const scheduler = unscheduler$();
    scheduler.register(workload);

    expect(workload.start).toHaveBeenCalled();
  });

  it('should wait workload to be ready before starting it', () => {
    const workload = workload$({ label: 'test', type: 'test', onStart: vi.fn() });
    workload.block();

    vi.spyOn(workload, 'start');

    const scheduler = unscheduler$();
    scheduler.register(workload);

    expect(workload.start).not.toHaveBeenCalled();

    workload.unblock();

    expect(workload.start).toHaveBeenCalled();
  });

  it('should not start a started task', () => {
    const workload = workload$({ label: 'test', type: 'test', onStart: vi.fn() });
    workload.start();

    vi.spyOn(workload, 'start');

    const scheduler = unscheduler$();

    scheduler.register(workload);

    expect(workload.start).not.toHaveBeenCalled();
  });
});
