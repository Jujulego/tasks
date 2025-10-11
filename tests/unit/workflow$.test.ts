import { workflow$ } from '@/src/workflow$.js';
import { workload$ } from '@/src/workload$.js';
import { describe, expect, it, vi } from 'vitest';

describe('group$', () => {
  it('should pass added workloads to onOrchestrate callback', () => {
    const wklA = workload$({ onStart: vi.fn() });
    const wklB = workload$({ onStart: vi.fn() });

    const onOrchestrate = vi.fn();
    const wkf = workflow$({ onOrchestrate });

    wkf.push(wklA, wklB);
    wkf.start();

    expect(onOrchestrate).toHaveBeenCalledExactlyOnceWith([wklA, wklB], expect.anything());
  });

  it('should throw when adding workload to a started group', () => {
    const wkl = workload$({ onStart: vi.fn() });
    const wkf = workflow$({ onOrchestrate: vi.fn() });

    wkf.start();

    expect(() => wkf.push(wkl)).toThrow(new Error('Cannot add a workload to a group in starting state'));
  });

  it('should throw when adding a started workload to a group', () => {
    const wkl = workload$({ onStart: vi.fn() });
    const wkf = workflow$({ onOrchestrate: vi.fn() });

    wkl.start();

    expect(() => wkf.push(wkl)).toThrow(new Error('Cannot add a workload in starting state to a group'));
  });

  it('should throw when adding to a group a workload belonging to another group', () => {
    const wkl = workload$({ onStart: vi.fn() });
    const wkfA = workflow$({ onOrchestrate: vi.fn() });
    const wkfB = workflow$({ onOrchestrate: vi.fn() });

    wkfA.push(wkl);

    expect(() => wkfB.push(wkl)).toThrow(new Error(`Cannot add workflow to group, it is already member of ${wkfA.id}`));
  });
});
