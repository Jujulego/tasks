import { type WorkloadOnStartProps, spawn$, type SpawnJob$, type Job$, job$, WorkloadState } from '@/src/index.js';
import { unscheduler$ } from '@/src/unscheduler$.js';
import { type Var, var$ } from 'kyrielle';
import { type ChildProcess, execFile } from 'node:child_process';
import { type Readable, type PassThrough } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks
vi.mock('node:child_process');
vi.mock('@/src/job$.js');

// Setup
let jobState$: Var<WorkloadState>;

beforeEach(() => {
  vi.resetAllMocks();

  jobState$ = var$<WorkloadState>(WorkloadState.Ready);
  vi.mocked(job$).mockReturnValue({ state$: jobState$ } as unknown as Job$);
});

// Tests
describe('spawn$', () => {
  it('should call job$', () => {
    const job = spawn$('echo', ['Hello World!'], { cwd: '/test', weight: 2 });

    expect(job$).toHaveBeenCalledWith({
      label: 'echo Hello World!',
      type: 'spawn',
      weight: 2,
      onStart: expect.any(Function),
    });

    expect(job.exitCode()).toBeNull();
    expect(job.cmd).toBe('echo');
    expect(job.args).toEqual(['Hello World!']);
    expect(job.cwd).toBe('/test');
  });

  it('should close streams once job completes', () => {
    const job = spawn$('echo', ['Hello World!'], { cwd: '/test', weight: 2 });

    vi.spyOn(job.stdout as PassThrough, 'end');
    vi.spyOn(job.stderr as PassThrough, 'end');

    jobState$.mutate(WorkloadState.Succeeded);

    expect((job.stdout as PassThrough).end).toHaveBeenCalledOnce();
    expect((job.stderr as PassThrough).end).toHaveBeenCalledOnce();
  });

  describe('onStart', () => {
    let job: SpawnJob$;
    let child: ChildProcess;
    let onStart: (this: void, props: WorkloadOnStartProps) => void;

    beforeEach(() => {
      job = spawn$('echo', ['Hello World!'], { cwd: '/test' });

      onStart = vi.mocked(job$).mock.calls[0]![0].onStart as (this: void, props: WorkloadOnStartProps) => void;

      child = {
        once: vi.fn(),
        stdout: { pipe: vi.fn() } as unknown as Readable,
        stderr: { pipe: vi.fn() } as unknown as Readable,
      } as unknown as ChildProcess;

      vi.mocked(execFile).mockReturnValue(child);
    });

    it('should call execFile to spawn process', () => {
      const controller = new AbortController();

      onStart({ scheduler: unscheduler$(), signal: controller.signal, setState: vi.fn() });

      expect(execFile).toHaveBeenCalledWith('echo', ['Hello World!'], {
        shell: true,
        windowsHide: true,
        signal: controller.signal,
        killSignal: 'SIGTERM',
        cwd: '/test',
        env: expect.anything()
      });
    });

    it('should set task state to running when process is spawned', () => {
      const controller = new AbortController();
      const setState = vi.fn();

      onStart({ scheduler: unscheduler$(), signal: controller.signal, setState });

      expect(child.once).toHaveBeenCalledWith('spawn', expect.any(Function));
      expect(setState).not.toHaveBeenCalled();

      // Call "spawn" event callback
      vi.mocked(child.once).mock.calls.find((call) => call[0] === 'spawn')![1]();

      expect(setState).toHaveBeenCalledWith(WorkloadState.Running);
    });

    it('should set task state to failed when process is errored', () => {
      const controller = new AbortController();
      const setState = vi.fn();

      onStart({ scheduler: unscheduler$(), signal: controller.signal, setState });

      expect(child.once).toHaveBeenCalledWith('error', expect.any(Function));
      expect(setState).not.toHaveBeenCalled();

      // Call "spawn" event callback
      vi.mocked(child.once as ((event: string, cb: (...args: unknown[]) => void) => void))
        .mock.calls.find((call) => call[0] === 'error')![1]();

      expect(setState).toHaveBeenCalledWith(WorkloadState.Failed);
    });

    it('should set task state to succeeded when process closes with exit code 0', async () => {
      const controller = new AbortController();
      const setState = vi.fn();

      onStart({ scheduler: unscheduler$(), signal: controller.signal, setState });

      expect(child.once).toHaveBeenCalledWith('close', expect.any(Function));
      expect(setState).not.toHaveBeenCalled();

      // Call "spawn" event callback
      vi.mocked(child.once as ((event: string, cb: (...args: unknown[]) => void) => void))
        .mock.calls.find((call) => call[0] === 'close')![1](0, null);

      expect(setState).toHaveBeenCalledWith(WorkloadState.Succeeded);
      expect(job.exitCode()).toBe(0);
    });

    it('should set task state to failed when process closes with exit code 1', async () => {
      const controller = new AbortController();
      const setState = vi.fn();

      onStart({ scheduler: unscheduler$(), signal: controller.signal, setState });

      expect(child.once).toHaveBeenCalledWith('close', expect.any(Function));
      expect(setState).not.toHaveBeenCalled();

      // Call "spawn" event callback
      vi.mocked(child.once as ((event: string, cb: (...args: unknown[]) => void) => void))
        .mock.calls.find((call) => call[0] === 'close')![1](1, null);

      expect(setState).toHaveBeenCalledWith(WorkloadState.Failed);
      expect(job.exitCode()).toBe(1);
    });
  });
});
