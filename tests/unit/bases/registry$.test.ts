import { registry$, workload$, WorkloadState } from '@/src/index.js';
import { once$, var$ } from 'kyrielle';
import { describe, expect, it, vi } from 'vitest';

describe('registry$', () => {
  it('should trigger added event once task is registered', () => {
    const reg = registry$();
    const wkl = workload$({ label: 'test', type: 'test', onStart: vi.fn() });

    const spy = vi.fn();
    reg.events$.on('added', spy);

    reg.register(wkl);

    expect(spy).toHaveBeenCalledExactlyOnceWith(wkl);
  });

  it('should trigger started event once registered task reached running state', () => {
    const reg = registry$();

    const trigger = var$<WorkloadState.Running>();
    const wkl = workload$({
      label: 'test',
      type: 'test',
      onStart: ({ setState }) => void once$(trigger, setState),
    });

    const spy = vi.fn();
    reg.events$.on('started', spy);

    reg.register(wkl);
    wkl.start();

    expect(spy).not.toHaveBeenCalled();

    trigger.mutate(WorkloadState.Running);

    expect(spy).toHaveBeenCalledExactlyOnceWith(wkl);
  });

  it('should trigger started event once registered task reached an end state', () => {
    const reg = registry$();

    const trigger = var$<WorkloadState.Succeeded>();
    const wkl = workload$({
      label: 'test',
      type: 'test',
      onStart: ({ setState }) => void once$(trigger, setState),
    });

    const spy = vi.fn();
    reg.events$.on('ended', spy);

    reg.register(wkl);
    wkl.start();

    expect(spy).not.toHaveBeenCalled();

    trigger.mutate(WorkloadState.Succeeded);

    expect(spy).toHaveBeenCalledExactlyOnceWith(wkl);
  });
});
