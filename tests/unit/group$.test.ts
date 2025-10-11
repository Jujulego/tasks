import { group$ } from '@/src/group$.js';
import { workload$ } from '@/src/workload$.js';
import { describe, expect, it, vi } from 'vitest';

describe('group$', () => {
  it('should pass added workloads to onOrchestrate callback', () => {
    const wklA = workload$({ onStart: vi.fn() });
    const wklB = workload$({ onStart: vi.fn() });

    const onOrchestrate = vi.fn();
    const grp = group$({ onOrchestrate });

    grp.push(wklA, wklB);
    grp.start();

    expect(onOrchestrate).toHaveBeenCalledExactlyOnceWith([wklA, wklB], expect.anything());
  });

  it('should throw when adding workload to a started group', () => {
    const wkl = workload$({ onStart: vi.fn() });
    const grp = group$({ onOrchestrate: vi.fn() });

    grp.start();

    expect(() => grp.push(wkl)).toThrow(new Error('Cannot add a workload to a group in starting state'));
  });

  it('should throw when adding a started workload to a group', () => {
    const wkl = workload$({ onStart: vi.fn() });
    const grp = group$({ onOrchestrate: vi.fn() });

    wkl.start();

    expect(() => grp.push(wkl)).toThrow(new Error('Cannot add a workload in starting state to a group'));
  });

  it('should throw when adding to a group a workload belonging to another group', () => {
    const wkl = workload$({ onStart: vi.fn() });
    const grpA = group$({ onOrchestrate: vi.fn() });
    const grpB = group$({ onOrchestrate: vi.fn() });

    grpA.push(wkl);

    expect(() => grpB.push(wkl)).toThrow(new Error(`Cannot add workflow to group, it is already member of ${grpA.id}`));
  });
});
