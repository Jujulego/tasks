import { WorkloadState } from '@/src/enums/workload-state.js';
import { unscheduler$ } from '@/src/unscheduler$.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testJob$ } from '../test-job$.js';
import { testWorkload$ } from '../test-workload$.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('job$', () => {
  it('should start once dependency has succeeded', async () => {
    // Prepare workload
    const wklA = testWorkload$({ label: 'A', wait: 1000, outcome: WorkloadState.Succeeded });
    const jobB = testJob$({ label: 'B', wait: 1000, outcome: WorkloadState.Succeeded });

    jobB.dependsOn(wklA);

    // Register them
    const scheduler = unscheduler$();
    scheduler.register(jobB);

    expect(scheduler.workloads()).toHaveLength(2);
    expect(scheduler.workloads()).toContain(wklA);
    expect(scheduler.workloads()).toContain(jobB);

    expect(wklA.start).toHaveBeenCalledOnce();
    expect(jobB.start).not.toHaveBeenCalled();

    expect(wklA.state()).toBe(WorkloadState.Running);
    expect(jobB.state()).toBe(WorkloadState.Blocked);

    // After 1s, jobB starts
    await vi.advanceTimersByTimeAsync(1000);

    expect(wklA.start).toHaveBeenCalledOnce();
    expect(jobB.start).toHaveBeenCalledOnce();

    expect(wklA.state()).toBe(WorkloadState.Succeeded);
    expect(jobB.state()).toBe(WorkloadState.Running);
  });

  it('should cancel once dependency is failed', async () => {
    // Prepare workload
    const wklA = testWorkload$({ label: 'A', wait: 1000, outcome: WorkloadState.Failed });
    const jobB = testJob$({ label: 'B', wait: 1000, outcome: WorkloadState.Succeeded });

    jobB.dependsOn(wklA);

    // Register them
    const scheduler = unscheduler$();
    scheduler.register(jobB);

    expect(scheduler.workloads()).toHaveLength(2);
    expect(scheduler.workloads()).toContain(wklA);
    expect(scheduler.workloads()).toContain(jobB);

    expect(wklA.start).toHaveBeenCalledOnce();
    expect(jobB.start).not.toHaveBeenCalled();

    expect(wklA.state()).toBe(WorkloadState.Running);
    expect(jobB.state()).toBe(WorkloadState.Blocked);

    // After 1s, jobB is canceled
    await vi.advanceTimersByTimeAsync(1000);

    expect(wklA.start).toHaveBeenCalledOnce();
    expect(jobB.start).not.toHaveBeenCalled();

    expect(wklA.state()).toBe(WorkloadState.Failed);
    expect(jobB.state()).toBe(WorkloadState.Canceled);
  });

  it('should cancel once dependency is canceled', () => {
    // Prepare workload
    const wklA = testWorkload$({ label: 'A', wait: 1000, outcome: WorkloadState.Failed });
    const jobB = testJob$({ label: 'B', wait: 1000, outcome: WorkloadState.Succeeded });

    jobB.dependsOn(wklA);

    // Register them
    const scheduler = unscheduler$();
    scheduler.register(jobB);

    expect(scheduler.workloads()).toHaveLength(2);
    expect(scheduler.workloads()).toContain(wklA);
    expect(scheduler.workloads()).toContain(jobB);

    expect(wklA.start).toHaveBeenCalledOnce();
    expect(jobB.start).not.toHaveBeenCalled();

    expect(wklA.state()).toBe(WorkloadState.Running);
    expect(jobB.state()).toBe(WorkloadState.Blocked);

    // Now cancel workload A
    wklA.cancel();

    expect(wklA.start).toHaveBeenCalledOnce();
    expect(jobB.start).not.toHaveBeenCalled();

    expect(wklA.state()).toBe(WorkloadState.Canceled);
    expect(jobB.state()).toBe(WorkloadState.Canceled);
  });
});