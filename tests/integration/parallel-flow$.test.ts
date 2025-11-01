import { WorkloadState } from '@/src/enums/workload-state.js';
import { parallelFlow$ } from '@/src/parallel-flow$.js';
import { unscheduler$ } from '@/src/unscheduler$.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testWorkload$ } from '../test-workload$.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('parallelFlow$', () => {
  it('should all workloads at same time and succeeds when all succeeded', async () => {
    const wklA = testWorkload$({ label: 'A', wait: 1000, outcome: WorkloadState.Succeeded });
    const wklB = testWorkload$({ label: 'B', wait: 2000, outcome: WorkloadState.Succeeded });
    const wklC = testWorkload$({ label: 'C', wait: 3000, outcome: WorkloadState.Succeeded });

    const flow = parallelFlow$();
    flow.push(wklA, wklB, wklC);

    const scheduler = unscheduler$();
    scheduler.register(flow);

    // At beginning all workloads have started
    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).toHaveBeenCalledOnce();
    expect(wklC.start).toHaveBeenCalledOnce();

    expect(flow.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Running);
    expect(wklB.state()).toBe(WorkloadState.Running);
    expect(wklC.state()).toBe(WorkloadState.Running);

    // After 1s, A is successful
    await vi.advanceTimersByTimeAsync(1000);

    expect(flow.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Succeeded);
    expect(wklB.state()).toBe(WorkloadState.Running);
    expect(wklC.state()).toBe(WorkloadState.Running);

    // After 1s, B is successful
    await vi.advanceTimersByTimeAsync(1000);

    expect(flow.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Succeeded);
    expect(wklB.state()).toBe(WorkloadState.Succeeded);
    expect(wklC.state()).toBe(WorkloadState.Running);

    // After 1s, C is successful and flow completed
    await vi.advanceTimersByTimeAsync(1000);

    expect(flow.state()).toBe(WorkloadState.Succeeded);
    expect(wklA.state()).toBe(WorkloadState.Succeeded);
    expect(wklB.state()).toBe(WorkloadState.Succeeded);
    expect(wklC.state()).toBe(WorkloadState.Succeeded);
  });

  it('should cancel other workflows if one fails', async () => {
    const wklA = testWorkload$({ label: 'A', wait: 1000, outcome: WorkloadState.Succeeded });
    const wklB = testWorkload$({ label: 'B', wait: 2000, outcome: WorkloadState.Failed });
    const wklC = testWorkload$({ label: 'C', wait: 3000, outcome: WorkloadState.Succeeded });

    const flow = parallelFlow$();
    flow.push(wklA, wklB, wklC);

    const scheduler = unscheduler$();
    scheduler.register(flow);

    // At beginning all workloads have started
    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).toHaveBeenCalledOnce();
    expect(wklC.start).toHaveBeenCalledOnce();

    expect(flow.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Running);
    expect(wklB.state()).toBe(WorkloadState.Running);
    expect(wklC.state()).toBe(WorkloadState.Running);

    // After 1s, A is successful
    await vi.advanceTimersByTimeAsync(1000);

    expect(flow.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Succeeded);
    expect(wklB.state()).toBe(WorkloadState.Running);
    expect(wklC.state()).toBe(WorkloadState.Running);

    // After 1s, B fails, C is canceled and flow failed
    await vi.advanceTimersByTimeAsync(1000);

    expect(flow.state()).toBe(WorkloadState.Failed);
    expect(wklA.state()).toBe(WorkloadState.Succeeded);
    expect(wklB.state()).toBe(WorkloadState.Failed);
    expect(wklC.state()).toBe(WorkloadState.Canceled);
  });

  it('should cancel alls workflows when flow is canceled', async () => {
    const wklA = testWorkload$({ label: 'A', wait: 1000, outcome: WorkloadState.Succeeded });
    const wklB = testWorkload$({ label: 'B', wait: 2000, outcome: WorkloadState.Succeeded });
    const wklC = testWorkload$({ label: 'C', wait: 3000, outcome: WorkloadState.Succeeded });

    const flow = parallelFlow$();
    flow.push(wklA, wklB, wklC);

    const scheduler = unscheduler$();
    scheduler.register(flow);

    // At beginning all workloads have started
    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).toHaveBeenCalledOnce();
    expect(wklC.start).toHaveBeenCalledOnce();

    expect(flow.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Running);
    expect(wklB.state()).toBe(WorkloadState.Running);
    expect(wklC.state()).toBe(WorkloadState.Running);

    // After 1s, A is successful
    await vi.advanceTimersByTimeAsync(1000);

    expect(flow.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Succeeded);
    expect(wklB.state()).toBe(WorkloadState.Running);
    expect(wklC.state()).toBe(WorkloadState.Running);

    // Upon cancel, all workloads are canceled
    flow.cancel();

    expect(flow.state()).toBe(WorkloadState.Canceled);
    expect(wklA.state()).toBe(WorkloadState.Succeeded);
    expect(wklB.state()).toBe(WorkloadState.Canceled);
    expect(wklC.state()).toBe(WorkloadState.Canceled);
  });
});
