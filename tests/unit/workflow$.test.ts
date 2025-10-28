import { workflow$ } from '@/src/workflow$.js';
import { workload$ } from '@/src/workload$.js';
import { describe, expect, it, vi } from 'vitest';

describe('workflow$', () => {
  it('should pass added workloads to onOrchestrate callback', () => {
    const wklA = workload$({ label: 'test', type: 'test', onStart: vi.fn() });
    const wklB = workload$({ label: 'test', type: 'test', onStart: vi.fn() });

    const onOrchestrate = vi.fn();
    const wkf = workflow$({ label: 'test', onOrchestrate });

    wkf.push(wklA, wklB);
    wkf.start();

    expect(onOrchestrate).toHaveBeenCalledExactlyOnceWith([wklA, wklB], expect.anything());
  });

  it('should throw when adding workload to a started workflow', () => {
    const wkl = workload$({ label: 'test', type: 'test', onStart: vi.fn() });
    const wkf = workflow$({ label: 'test', onOrchestrate: vi.fn() });

    wkf.start();

    expect(() => wkf.push(wkl)).toThrow(new Error('Cannot add a workload to a workflow in starting state'));
  });

  it('should throw when adding a started workload to a workflow', () => {
    const wkl = workload$({ label: 'test', type: 'test', onStart: vi.fn() });
    const wkf = workflow$({ label: 'test', onOrchestrate: vi.fn() });

    wkl.start();

    expect(() => wkf.push(wkl)).toThrow(new Error('Cannot add a workload in starting state to a workflow'));
  });

  it('should throw when adding to a group a workload belonging to another group', () => {
    const wkl = workload$({ label: 'test', type: 'test', onStart: vi.fn() });
    const wkfA = workflow$({ label: 'test', onOrchestrate: vi.fn() });
    const wkfB = workflow$({ label: 'test', onOrchestrate: vi.fn() });

    wkfA.push(wkl);

    expect(() => wkfB.push(wkl)).toThrow(new Error(`Cannot add workload to workflow, it is already member of ${wkfA.id}`));
  });
});
