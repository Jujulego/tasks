import { WorkloadState } from '@/src/enums/workload-state.js';
import { fallbackFlow$ } from '@/src/fallback-flow$.js';
import { unscheduler$ } from '@/src/unscheduler$.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testWorkload$ } from '../test-workload$.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('fallbackFlow$', () => {
  it('should run workloads one after the other', async () => {
    const wklA = testWorkload$({ label: 'A', wait: 1000, outcome: WorkloadState.Failed });
    const wklB = testWorkload$({ label: 'B', wait: 1000, outcome: WorkloadState.Failed });
    const wklC = testWorkload$({ label: 'C', wait: 1000, outcome: WorkloadState.Failed });

    const flow = fallbackFlow$();
    flow.push(wklA, wklB, wklC);

    const scheduler = unscheduler$();
    scheduler.register(flow);

    // At the beginning only A starts
    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).not.toHaveBeenCalled();
    expect(wklC.start).not.toHaveBeenCalled();

    expect(flow.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Running);
    expect(wklB.state()).toBe(WorkloadState.Ready);
    expect(wklC.state()).toBe(WorkloadState.Ready);

    // After 1s, A fails and B should start
    await vi.advanceTimersByTimeAsync(1000);

    expect(flow.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Failed);
    expect(wklB.state()).toBe(WorkloadState.Running);
    expect(wklC.state()).toBe(WorkloadState.Ready);

    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).toHaveBeenCalledOnce();
    expect(wklC.start).not.toHaveBeenCalled();

    // After 1s, B fails and C should start
    await vi.advanceTimersByTimeAsync(1000);

    expect(flow.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Failed);
    expect(wklB.state()).toBe(WorkloadState.Failed);
    expect(wklC.state()).toBe(WorkloadState.Running);

    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).toHaveBeenCalledOnce();
    expect(wklC.start).toHaveBeenCalledOnce();

    // After 1s, C fails and flow is now failed
    await vi.advanceTimersByTimeAsync(1000);

    expect(flow.state()).toBe(WorkloadState.Failed);
    expect(wklA.state()).toBe(WorkloadState.Failed);
    expect(wklB.state()).toBe(WorkloadState.Failed);
    expect(wklC.state()).toBe(WorkloadState.Failed);
  });

  it('should cancel next workloads after a success', async () => {
    const wklA = testWorkload$({ label: 'A', wait: 1000, outcome: WorkloadState.Failed });
    const wklB = testWorkload$({ label: 'B', wait: 1000, outcome: WorkloadState.Succeeded });
    const wklC = testWorkload$({ label: 'C', wait: 1000, outcome: WorkloadState.Failed });

    const flow = fallbackFlow$();
    flow.push(wklA, wklB, wklC);

    const scheduler = unscheduler$();
    scheduler.register(flow);

    // At the beginning only A starts
    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).not.toHaveBeenCalled();
    expect(wklC.start).not.toHaveBeenCalled();

    expect(flow.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Running);
    expect(wklB.state()).toBe(WorkloadState.Ready);
    expect(wklC.state()).toBe(WorkloadState.Ready);

    // After 1s, A fails and B should start
    await vi.advanceTimersByTimeAsync(1000);

    expect(flow.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Failed);
    expect(wklB.state()).toBe(WorkloadState.Running);
    expect(wklC.state()).toBe(WorkloadState.Ready);

    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).toHaveBeenCalledOnce();
    expect(wklC.start).not.toHaveBeenCalled();

    // After 1s, B succeeds, C should be canceled and flow succeeds
    await vi.advanceTimersByTimeAsync(1000);

    expect(flow.state()).toBe(WorkloadState.Succeeded);
    expect(wklA.state()).toBe(WorkloadState.Failed);
    expect(wklB.state()).toBe(WorkloadState.Succeeded);
    expect(wklC.state()).toBe(WorkloadState.Canceled);

    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).toHaveBeenCalledOnce();
    expect(wklC.start).not.toHaveBeenCalled();
  });

  it('should cancel workloads when sequence is canceled', async () => {
    const wklA = testWorkload$({ label: 'A', wait: 1000, outcome: WorkloadState.Failed });
    const wklB = testWorkload$({ label: 'B', wait: 1000, outcome: WorkloadState.Failed });
    const wklC = testWorkload$({ label: 'C', wait: 1000, outcome: WorkloadState.Failed });

    const flow = fallbackFlow$();
    flow.push(wklA, wklB, wklC);

    const scheduler = unscheduler$();
    scheduler.register(flow);

    // At the beginning only A starts
    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).not.toHaveBeenCalled();
    expect(wklC.start).not.toHaveBeenCalled();

    expect(flow.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Running);
    expect(wklB.state()).toBe(WorkloadState.Ready);
    expect(wklC.state()).toBe(WorkloadState.Ready);

    // After 1s, A fails and B should start
    await vi.advanceTimersByTimeAsync(1000);

    expect(flow.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Failed);
    expect(wklB.state()).toBe(WorkloadState.Running);
    expect(wklC.state()).toBe(WorkloadState.Ready);

    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).toHaveBeenCalledOnce();
    expect(wklC.start).not.toHaveBeenCalled();

    // After cancel, B & C should be canceled
    flow.cancel();

    await vi.waitFor(() => expect(flow.state()).toBe(WorkloadState.Canceled));

    expect(wklA.state()).toBe(WorkloadState.Failed);
    expect(wklB.state()).toBe(WorkloadState.Canceled);
    expect(wklC.state()).toBe(WorkloadState.Canceled);

    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).toHaveBeenCalledOnce();
    expect(wklC.start).not.toHaveBeenCalled();
  });
});
