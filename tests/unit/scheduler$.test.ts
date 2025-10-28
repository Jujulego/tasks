import { scheduler$, workload$, WorkloadState } from '@/src/index.js';
import { once$, var$ } from 'kyrielle';
import { describe, expect, it, vi } from 'vitest';

describe('scheduler$', () => {
  it('should register and immediately start the given workload', async () => {
    const workload = workload$({ id: 'test-1', label: 'test', type: 'test', onStart: vi.fn() });
    vi.spyOn(workload, 'start');

    const scheduler = scheduler$();
    scheduler.register(workload);

    expect(workload.start).toHaveBeenCalled();
  });

  it('should wait workload to be ready before starting it', () => {
    const workload = workload$({ id: 'test-1', label: 'test', type: 'test', onStart: vi.fn() });
    workload.block();

    vi.spyOn(workload, 'start');

    const scheduler = scheduler$();
    scheduler.register(workload);

    expect(workload.start).not.toHaveBeenCalled();

    workload.unblock();

    expect(workload.start).toHaveBeenCalled();
  });

  it('should not start a started task', () => {
    const workload = workload$({ id: 'test-1', label: 'test', type: 'test', onStart: vi.fn() });
    workload.start();

    vi.spyOn(workload, 'start');

    const scheduler = scheduler$();

    scheduler.register(workload);

    expect(workload.start).not.toHaveBeenCalled();
  });

  it('should register both workloads but only start the first', async () => {
    const w1 = workload$({ id: 'test-1', label: 'test', type: 'test', weight: 1, onStart: vi.fn() });
    vi.spyOn(w1, 'start');

    const w2 = workload$({ id: 'test-2', label: 'test', type: 'test', weight: 1, onStart: vi.fn() });
    vi.spyOn(w2, 'start');

    const scheduler = scheduler$({ strength: 1 });

    scheduler.register(w1);
    scheduler.register(w2);

    expect(w1.start).toHaveBeenCalled();
    expect(w2.start).not.toHaveBeenCalled();
  });

  it('should start second task as first one immediately ends', async () => {
    const w1 = workload$({
      id: 'test-1',
      label: 'test',
      type: 'test',
      weight: 1,
      onStart: ({ setState }) => setState(WorkloadState.Succeeded)
    });
    vi.spyOn(w1, 'start');

    const w2 = workload$({ id: 'test-2', label: 'test', type: 'test', weight: 1, onStart: vi.fn() });
    vi.spyOn(w2, 'start');

    const scheduler = scheduler$({ strength: 1 });

    scheduler.register(w1);
    scheduler.register(w2);

    expect(w1.start).toHaveBeenCalled();
    expect(w2.start).toHaveBeenCalled();
  });

  it('should start second task as first one later ends', async () => {
    const end$ = var$<WorkloadState.Succeeded>();
    const w1 = workload$({
      id: 'test-1',
      label: 'test',
      type: 'test',
      weight: 1,
      onStart: ({ setState }) => void once$(end$, setState),
    });
    vi.spyOn(w1, 'start');

    const w2 = workload$({ id: 'test-2', label: 'test', type: 'test', weight: 1, onStart: vi.fn() });
    vi.spyOn(w2, 'start');

    const scheduler = scheduler$({ strength: 1 });

    scheduler.register(w1);
    scheduler.register(w2);

    expect(w1.start).toHaveBeenCalled();
    expect(w2.start).not.toHaveBeenCalled();

    end$.mutate(WorkloadState.Succeeded);

    expect(w2.start).toHaveBeenCalled();
  });
});
