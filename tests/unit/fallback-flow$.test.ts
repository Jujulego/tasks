import { registry$ } from '@/src/bases/registry$.js';
import { WorkloadState } from '@/src/enums/workload-state.js';
import { fallbackFlow$ } from '@/src/index.js';
import { workflow$, type Workflow$ } from '@/src/workflow$.js';
import { workload$ } from '@/src/workload$.js';
import { var$ } from 'kyrielle';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks
vi.mock('@/src/workflow$.js');

beforeEach(() => {
  vi.resetAllMocks();
});

// Tests
describe('fallbackFlow$', () => {
  it('should build a workflow', () => {
    const workflow = {} as Workflow$;
    vi.mocked(workflow$).mockReturnValue(workflow);

    expect(fallbackFlow$()).toBe(workflow);

    expect(workflow$).toHaveBeenCalledWith({
      label: 'Fallback flow',
      type: 'workflow.fallback',
      weight: 0,
      onOrchestrate: expect.any(Function),
    });
  });

  describe('onOrchestrate', () => {
    it('should register workloads one after the other, as they fails', async () => {
      // Prepare elements
      const reg = registry$();
      vi.spyOn(reg, 'register');

      const wkl1 = { id: '1', state$: var$(WorkloadState.Ready) };
      const wkl2 = { id: '2', state$: var$(WorkloadState.Ready) };

      const setState = vi.fn();
      const controller = new AbortController();

      // Call callback
      fallbackFlow$();

      const { onOrchestrate } = vi.mocked(workflow$).mock.calls[0]![0];
      const prom = onOrchestrate([wkl1, wkl2] as unknown as Workflow$[], {
        setState,
        scheduler: reg,
        signal: controller.signal,
      });

      expect(setState).toHaveBeenCalledWith(WorkloadState.Running);

      // Register first workload
      expect(reg.register).toHaveBeenCalledOnce();
      expect(reg.register).toHaveBeenCalledWith(wkl1);
      expect(reg.register).not.toHaveBeenCalledWith(wkl2);

      // When first fails ...
      wkl1.state$.mutate(WorkloadState.Failed);

      await vi.waitFor(() => expect(reg.register).toHaveBeenCalledWith(wkl2));

      // When second succeeds ...
      wkl2.state$.mutate(WorkloadState.Failed);

      await prom;

      expect(setState).toHaveBeenCalledWith(WorkloadState.Failed);
    });

    it('should succeeds as one workload succeeds', async () => {
      // Prepare elements
      const reg = registry$();
      vi.spyOn(reg, 'register');

      const wkl1 = { id: '1', state$: var$(WorkloadState.Ready), cancel: vi.fn() };
      const wkl2 = { id: '2', state$: var$(WorkloadState.Ready), cancel: vi.fn() };

      const setState = vi.fn();
      const controller = new AbortController();

      // Call callback
      fallbackFlow$();

      const { onOrchestrate } = vi.mocked(workflow$).mock.calls[0]![0];
      const prom = onOrchestrate([wkl1, wkl2] as unknown as Workflow$[], {
        setState,
        scheduler: reg,
        signal: controller.signal,
      });

      expect(setState).toHaveBeenCalledWith(WorkloadState.Running);
      expect(reg.register).toHaveBeenCalledWith(wkl1);

      // When first fails ...
      wkl1.state$.mutate(WorkloadState.Succeeded);

      await prom;

      expect(setState).toHaveBeenCalledWith(WorkloadState.Succeeded);

      expect(wkl2.cancel).toHaveBeenCalledOnce();
      expect(reg.register).not.toHaveBeenCalledWith(wkl2);
    });

    it('should cancel all workflows when signal aborts', async () => {
      // Prepare workloads
      const reg = registry$();

      const wkl1 = workload$({ label: 'test', type: 'test', onStart: vi.fn() });
      vi.spyOn(wkl1, 'cancel').mockResolvedValue();

      const wkl2 = workload$({ label: 'test', type: 'test', onStart: vi.fn() });
      vi.spyOn(wkl2, 'cancel').mockResolvedValue();

      const setState = vi.fn();
      const controller = new AbortController();

      // Call callback
      fallbackFlow$();

      const { onOrchestrate } = vi.mocked(workflow$).mock.calls[0]![0];
      void onOrchestrate([wkl1, wkl2] as unknown as Workflow$[], {
        setState,
        scheduler: reg,
        signal: controller.signal,
      });

      controller.abort();

      expect(wkl1.cancel).toHaveBeenCalledOnce();
      expect(wkl2.cancel).toHaveBeenCalledOnce();
    });
  });
});
