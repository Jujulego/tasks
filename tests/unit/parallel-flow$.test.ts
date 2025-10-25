import {
  parallelFlow$,
  registry$,
  workflow$,
  type Workflow$,
  type Workload$,
  workload$,
  WorkloadState
} from '@/src/index.js';
import { var$ } from 'kyrielle';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks
vi.mock('@/src/workflow$.js');

beforeEach(() => {
  vi.resetAllMocks();
});

// Tests
describe('parallelFlow$', () => {
  it('should build a workflow', () => {
    const workflow = {} as Workflow$;
    vi.mocked(workflow$).mockReturnValue(workflow);

    expect(parallelFlow$()).toBe(workflow);

    expect(workflow$).toHaveBeenCalledWith({
      weight: 0,
      onOrchestrate: expect.any(Function),
      onCancel: expect.any(Function),
    });
  });

  describe('onOrchestrate', () => {
    it('should register all added workloads', async () => {
      // Prepare elements
      const reg = registry$();
      vi.spyOn(reg, 'register');

      const wkl1 = workload$({ label: 'test', onStart: vi.fn() });
      const wkl2 = workload$({ label: 'test', onStart: vi.fn() });

      const setState = vi.fn();
      const controller = new AbortController();

      // Call callback
      parallelFlow$();

      const { onOrchestrate } = vi.mocked(workflow$).mock.calls[0]![0];
      await onOrchestrate([wkl1, wkl2], {
        setState,
        scheduler: reg,
        signal: controller.signal,
      });

      expect(setState).toHaveBeenCalledExactlyOnceWith(WorkloadState.Running);

      expect(reg.register).toHaveBeenCalledTimes(2);
      expect(reg.register).toHaveBeenCalledWith(wkl1);
      expect(reg.register).toHaveBeenCalledWith(wkl2);
    });

    it('should set state to succeeded as soon as all workloads succeeded', async () => {
      // Prepare elements
      const reg = registry$();

      const wkl1 = { state$: var$(WorkloadState.Ready) };
      const wkl2 = { state$: var$(WorkloadState.Ready) };

      const setState = vi.fn();
      const controller = new AbortController();

      // Call callback
      parallelFlow$();

      const { onOrchestrate } = vi.mocked(workflow$).mock.calls[0]![0];
      await onOrchestrate([wkl1, wkl2] as unknown as Workload$[], {
        setState,
        scheduler: reg,
        signal: controller.signal,
      });

      expect(setState).toHaveBeenCalledExactlyOnceWith(WorkloadState.Running);
      setState.mockClear();

      wkl1.state$.mutate(WorkloadState.Succeeded);
      wkl2.state$.mutate(WorkloadState.Succeeded);

      expect(setState).toHaveBeenCalledExactlyOnceWith(WorkloadState.Succeeded);
    });

    it('should set state to failed if one workload failed', async () => {
      // Prepare elements
      const reg = registry$();

      const wkl1 = { state$: var$(WorkloadState.Ready) };
      const wkl2 = { state$: var$(WorkloadState.Ready) };

      const setState = vi.fn();
      const controller = new AbortController();

      // Call callback
      parallelFlow$();

      const { onOrchestrate } = vi.mocked(workflow$).mock.calls[0]![0];
      await onOrchestrate([wkl1, wkl2] as unknown as Workload$[], {
        setState,
        scheduler: reg,
        signal: controller.signal,
      });

      expect(setState).toHaveBeenCalledExactlyOnceWith(WorkloadState.Running);
      setState.mockClear();

      wkl1.state$.mutate(WorkloadState.Succeeded);
      wkl2.state$.mutate(WorkloadState.Failed);

      expect(setState).toHaveBeenCalledExactlyOnceWith(WorkloadState.Failed);
    });
  });

  describe('onCancel', () => {
    it('should cancel all added workloads', async () => {
      // Prepare workloads
      const wkl1 = workload$({ label: 'test', onStart: vi.fn() });
      vi.spyOn(wkl1, 'cancel').mockResolvedValue();

      const wkl2 = workload$({ label: 'test', onStart: vi.fn() });
      vi.spyOn(wkl2, 'cancel').mockResolvedValue();

      // Call callback
      parallelFlow$();

      const { onCancel } = vi.mocked(workflow$).mock.calls[0]![0];
      await onCancel!([wkl1, wkl2]);

      expect(wkl1.cancel).toHaveBeenCalledOnce();
      expect(wkl2.cancel).toHaveBeenCalledOnce();
    });
  });
});
