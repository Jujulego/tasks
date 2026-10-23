import { WorkloadState } from '@/src/enums/workload-state.js';
import { sequenceFlow$ } from '@/src/sequence-flow$.js';
import { unscheduler$ } from '@/src/unscheduler$.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testWorkload$ } from '../test-workload$.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('sequenceFlow$', () => {
  it('should run workloads one after the other', async () => {
    const wklA = testWorkload$({ label: 'A', wait: 1000, outcome: WorkloadState.Succeeded });
    const wklB = testWorkload$({ label: 'B', wait: 1000, outcome: WorkloadState.Succeeded });
    const wklC = testWorkload$({ label: 'C', wait: 1000, outcome: WorkloadState.Succeeded });

    const flow = sequenceFlow$();
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

    // After 1s, A succeeds and B should start
    await vi.advanceTimersByTimeAsync(1000);

    expect(flow.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Succeeded);
    expect(wklB.state()).toBe(WorkloadState.Running);
    expect(wklC.state()).toBe(WorkloadState.Ready);

    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).toHaveBeenCalledOnce();
    expect(wklC.start).not.toHaveBeenCalled();

    // After 1s, B succeeds and C should start
    await vi.advanceTimersByTimeAsync(1000);

    expect(flow.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Succeeded);
    expect(wklB.state()).toBe(WorkloadState.Succeeded);
    expect(wklC.state()).toBe(WorkloadState.Running);

    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).toHaveBeenCalledOnce();
    expect(wklC.start).toHaveBeenCalledOnce();

    // After 1s, C succeeds, flow is now complete !
    await vi.advanceTimersByTimeAsync(1000);

    expect(flow.state()).toBe(WorkloadState.Succeeded);
    expect(wklA.state()).toBe(WorkloadState.Succeeded);
    expect(wklB.state()).toBe(WorkloadState.Succeeded);
    expect(wklC.state()).toBe(WorkloadState.Succeeded);
  });

  it('should cancel next workloads after a failure', async () => {
    const wklA = testWorkload$({ label: 'A', wait: 1000, outcome: WorkloadState.Succeeded });
    const wklB = testWorkload$({ label: 'B', wait: 1000, outcome: WorkloadState.Failed });
    const wklC = testWorkload$({ label: 'C', wait: 1000, outcome: WorkloadState.Succeeded });

    const sequence = sequenceFlow$();
    sequence.push(wklA, wklB, wklC);

    const scheduler = unscheduler$();
    scheduler.register(sequence);

    // At the beginning only A starts
    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).not.toHaveBeenCalled();
    expect(wklC.start).not.toHaveBeenCalled();

    expect(sequence.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Running);
    expect(wklB.state()).toBe(WorkloadState.Ready);
    expect(wklC.state()).toBe(WorkloadState.Ready);

    // After 1s, A succeeds and B should start
    await vi.advanceTimersByTimeAsync(1000);

    expect(sequence.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Succeeded);
    expect(wklB.state()).toBe(WorkloadState.Running);
    expect(wklC.state()).toBe(WorkloadState.Ready);

    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).toHaveBeenCalledOnce();
    expect(wklC.start).not.toHaveBeenCalled();

    // After 1s, B fails, C is canceled and flow should be failed
    await vi.advanceTimersByTimeAsync(1000);

    expect(sequence.state()).toBe(WorkloadState.Failed);
    expect(wklA.state()).toBe(WorkloadState.Succeeded);
    expect(wklB.state()).toBe(WorkloadState.Failed);
    expect(wklC.state()).toBe(WorkloadState.Canceled);

    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).toHaveBeenCalledOnce();
    expect(wklC.start).not.toHaveBeenCalled();
  });

  it('should cancel workloads when sequence is canceled', async () => {
    const wklA = testWorkload$({ label: 'A', wait: 1000, outcome: WorkloadState.Succeeded });
    const wklB = testWorkload$({ label: 'B', wait: 1000, outcome: WorkloadState.Succeeded });
    const wklC = testWorkload$({ label: 'C', wait: 1000, outcome: WorkloadState.Succeeded });

    const sequence = sequenceFlow$();
    sequence.push(wklA, wklB, wklC);

    const scheduler = unscheduler$();
    scheduler.register(sequence);

    // At the beginning only A starts
    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).not.toHaveBeenCalled();
    expect(wklC.start).not.toHaveBeenCalled();

    expect(sequence.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Running);
    expect(wklB.state()).toBe(WorkloadState.Ready);
    expect(wklC.state()).toBe(WorkloadState.Ready);

    // After 1s, A succeeds and B should start
    await vi.advanceTimersByTimeAsync(1000);

    expect(sequence.state()).toBe(WorkloadState.Running);
    expect(wklA.state()).toBe(WorkloadState.Succeeded);
    expect(wklB.state()).toBe(WorkloadState.Running);
    expect(wklC.state()).toBe(WorkloadState.Ready);

    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).toHaveBeenCalledOnce();
    expect(wklC.start).not.toHaveBeenCalled();

    // After cancel, B & C should be canceled
    sequence.cancel();

    await vi.waitFor(() => expect(sequence.state()).toBe(WorkloadState.Canceled));

    expect(wklA.state()).toBe(WorkloadState.Succeeded);
    expect(wklB.state()).toBe(WorkloadState.Canceled);
    expect(wklC.state()).toBe(WorkloadState.Canceled);

    expect(wklA.start).toHaveBeenCalledOnce();
    expect(wklB.start).toHaveBeenCalledOnce();
    expect(wklC.start).not.toHaveBeenCalled();
  });
});
