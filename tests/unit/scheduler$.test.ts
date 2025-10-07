import { scheduler$, workload$, WorkloadState } from '@/src/index.js';
import { once$, var$ } from 'kyrielle';
import { describe, expect, it, vi } from 'vitest';

describe('scheduler$', () => {
  it('should register and immediately start the given workload', async () => {
    const workload = workload$({ id: 'test-1', onStart: vi.fn() });
    vi.spyOn(workload, 'start');

    const scheduler = scheduler$();

    const spyAdded = vi.fn();
    const spyStarted = vi.fn();
    scheduler.events$.on('added', spyAdded);
    scheduler.events$.on('started', spyStarted);

    scheduler.register(workload);

    expect(spyAdded).toHaveBeenCalledWith(workload);

    expect(workload.start).toHaveBeenCalled();

    await vi.waitFor(() => expect(spyStarted).toHaveBeenCalledWith(workload));
  });

  it('should throw when registering a non waiting workflow', async () => {
    const workload = workload$({ id: 'test-1', onStart: vi.fn() });
    await workload.start();
    vi.spyOn(workload, 'start');

    const scheduler = scheduler$();

    const spyAdded = vi.fn();
    scheduler.events$.on('added', spyAdded);

    expect(() => scheduler.register(workload)).toThrow(new Error('Cannot schedule a workload in starting state'));

    expect(spyAdded).not.toHaveBeenCalledWith(workload);
    expect(workload.start).not.toHaveBeenCalled();
  });

  it('should register both workloads but only start the first', async () => {
    const w1 = workload$({ id: 'test-1', weight: 1, onStart: vi.fn() });
    vi.spyOn(w1, 'start');

    const w2 = workload$({ id: 'test-2', weight: 1, onStart: vi.fn() });
    vi.spyOn(w2, 'start');

    const scheduler = scheduler$({ strength: 1 });

    const spyAdded = vi.fn();
    const spyStarted = vi.fn();
    scheduler.events$.on('added', spyAdded);
    scheduler.events$.on('started', spyStarted);

    scheduler.register(w1);
    scheduler.register(w2);

    expect(spyAdded).toHaveBeenCalledTimes(2);
    expect(spyAdded).toHaveBeenCalledWith(w1);
    expect(spyAdded).toHaveBeenCalledWith(w2);

    await vi.waitFor(() => expect(spyStarted).toHaveBeenCalledWith(w1));

    expect(w1.start).toHaveBeenCalled();
    expect(w2.start).not.toHaveBeenCalled();
  });

  it('should start second task as first one immediately ends', async () => {
    const w1 = workload$({
      id: 'test-1',
      weight: 1,
      onStart: ({ setState }) => setState(WorkloadState.Succeeded)
    });
    vi.spyOn(w1, 'start');

    const w2 = workload$({ id: 'test-2', weight: 1, onStart: vi.fn() });
    vi.spyOn(w2, 'start');

    const scheduler = scheduler$({ strength: 1 });

    const spyAdded = vi.fn();
    const spyStarted = vi.fn();
    scheduler.events$.on('added', spyAdded);
    scheduler.events$.on('started', spyStarted);

    scheduler.register(w1);
    scheduler.register(w2);

    expect(spyAdded).toHaveBeenCalledTimes(2);
    expect(spyAdded).toHaveBeenCalledWith(w1);
    expect(spyAdded).toHaveBeenCalledWith(w2);

    await vi.waitFor(() => expect(spyStarted).toHaveBeenCalledWith(w1));
    
    expect(w1.start).toHaveBeenCalled();
    expect(w2.start).toHaveBeenCalled();
  });

  it('should start second task as first one later ends', async () => {
    const end$ = var$<WorkloadState.Succeeded>();
    const w1 = workload$({
      id: 'test-1',
      weight: 1,
      onStart: ({ setState }) => void once$(end$, setState),
    });
    vi.spyOn(w1, 'start');

    const w2 = workload$({ id: 'test-2', weight: 1, onStart: vi.fn() });
    vi.spyOn(w2, 'start');

    const scheduler = scheduler$({ strength: 1 });

    const spyAdded = vi.fn();
    const spyStarted = vi.fn();
    scheduler.events$.on('added', spyAdded);
    scheduler.events$.on('started', spyStarted);

    scheduler.register(w1);
    scheduler.register(w2);

    expect(spyAdded).toHaveBeenCalledTimes(2);
    expect(spyAdded).toHaveBeenCalledWith(w1);
    expect(spyAdded).toHaveBeenCalledWith(w2);

    await vi.waitFor(() => expect(spyStarted).toHaveBeenCalledWith(w1));

    expect(w1.start).toHaveBeenCalled();
    expect(w2.start).not.toHaveBeenCalled();

    end$.mutate(WorkloadState.Succeeded);
    await vi.waitFor(() => expect(spyStarted).toHaveBeenCalledWith(w2));

    expect(w2.start).toHaveBeenCalled();
  });
});