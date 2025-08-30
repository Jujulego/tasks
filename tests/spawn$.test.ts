import { spawn$, type SpawnTask$, task$, type TaskOnStartProps, TaskState } from '@/src/index.js';
import { type ChildProcess, execFile } from 'node:child_process';
import { type Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks
vi.mock('node:child_process');
vi.mock('@/src/task$.js');

// Setup
beforeEach(() => {
  vi.resetAllMocks();
});

// Tests
describe('spawn$', () => {
  it('should call task$ to create task', () => {
    const task = spawn$('echo', ['Hello World!'], { cwd: '/test', weight: 2 });

    expect(task$).toHaveBeenCalledWith({
      id: 'cbe401e31f0981953038940216faffe6',
      weight: 2,
      onStart: expect.any(Function),
      onCancel: expect.any(Function),
    });

    expect(task.exitCode).toBeNull();
  });

  describe('callbacks', () => {
    let task: SpawnTask$;
    let child: ChildProcess;
    let onStart: (this: void, props: TaskOnStartProps) => void;
    let onCancel: (this: void) => Promise<void>;

    beforeEach(() => {
      task = spawn$('echo', ['Hello World!'], { cwd: '/test' });

      onStart = vi.mocked(task$).mock.calls[0]![0].onStart;
      onCancel = vi.mocked(task$).mock.calls[0]![0].onCancel! as (this: void) => Promise<void>;

      child = {
        once: vi.fn(),
        stdout: { pipe: vi.fn() } as unknown as Readable,
        stderr: { pipe: vi.fn() } as unknown as Readable,
      } as unknown as ChildProcess;

      vi.mocked(execFile).mockReturnValue(child);
    });

    it('should call execFile to spawn process', () => {
      const controller = new AbortController();

      onStart({ signal: controller.signal, setState: vi.fn() });

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

      onStart({ signal: controller.signal, setState });

      expect(child.once).toHaveBeenCalledWith('spawn', expect.any(Function));
      expect(setState).not.toHaveBeenCalled();

      // Call "spawn" event callback
      vi.mocked(child.once).mock.calls.find((call) => call[0] === 'spawn')![1]();

      expect(setState).toHaveBeenCalledWith(TaskState.Running);
    });

    it('should set task state to failed when process is errored', () => {
      const controller = new AbortController();
      const setState = vi.fn();

      onStart({ signal: controller.signal, setState });

      expect(child.once).toHaveBeenCalledWith('error', expect.any(Function));
      expect(setState).not.toHaveBeenCalled();

      // Call "spawn" event callback
      vi.mocked(child.once as ((event: string, cb: (...args: unknown[]) => void) => void))
        .mock.calls.find((call) => call[0] === 'error')![1]();

      expect(setState).toHaveBeenCalledWith(TaskState.Failed);
    });

    it('should set task state to succeeded when process closes with exit code 0', async () => {
      const controller = new AbortController();
      const setState = vi.fn();
      const cancelResolved = vi.fn();

      onStart({ signal: controller.signal, setState });
      void onCancel().then(cancelResolved);

      expect(child.once).toHaveBeenCalledWith('close', expect.any(Function));
      expect(setState).not.toHaveBeenCalled();
      expect(cancelResolved).not.toHaveBeenCalled();

      // Call "spawn" event callback
      vi.mocked(child.once as ((event: string, cb: (...args: unknown[]) => void) => void))
        .mock.calls.find((call) => call[0] === 'close')![1](0, null);

      expect(setState).toHaveBeenCalledWith(TaskState.Succeeded);
      expect(task.exitCode).toBe(0);

      await vi.waitFor(() => expect(cancelResolved).toHaveBeenCalled());
    });

    it('should set task state to failed when process closes with exit code 1', async () => {
      const controller = new AbortController();
      const setState = vi.fn();
      const cancelResolved = vi.fn();

      onStart({ signal: controller.signal, setState });
      void onCancel().then(cancelResolved);

      expect(child.once).toHaveBeenCalledWith('close', expect.any(Function));
      expect(setState).not.toHaveBeenCalled();
      expect(cancelResolved).not.toHaveBeenCalled();

      // Call "spawn" event callback
      vi.mocked(child.once as ((event: string, cb: (...args: unknown[]) => void) => void))
        .mock.calls.find((call) => call[0] === 'close')![1](1, null);

      expect(setState).toHaveBeenCalledWith(TaskState.Failed);
      expect(task.exitCode).toBe(1);

      await vi.waitFor(() => expect(cancelResolved).toHaveBeenCalled());
    });
  });
});
