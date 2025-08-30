import { spawn$, type SpawnTask$, task$, type TaskOnStartProps } from '@/src/index.js';
import { execFile, type ChildProcess } from 'node:child_process';
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
    let onStart: (this: void, props: TaskOnStartProps) => Promise<void> | void;
    let onCancel: (this: void) => Promise<void> | void;

    beforeEach(() => {
      task = spawn$('echo', ['Hello World!'], { cwd: '/test' });

      onStart = vi.mocked(task$).mock.calls[0]![0].onStart;
      onCancel = vi.mocked(task$).mock.calls[0]![0].onCancel!;

      vi.mocked(execFile).mockReturnValue({
        once: vi.fn(),
        stdout: { pipe: vi.fn() } as unknown as Readable,
        stderr: { pipe: vi.fn() } as unknown as Readable,
      } as unknown as ChildProcess);
    });

    it('should call execFile to spawn process', async () => {
      const controller = new AbortController();
      const setState = vi.fn();

      await onStart({ signal: controller.signal, setState });

      expect(execFile).toHaveBeenCalledWith('echo', ['Hello World!'], {
        shell: true,
        windowsHide: true,
        signal: controller.signal,
        killSignal: 'SIGTERM',
        cwd: '/test',
        env: expect.anything()
      });
    });
  });
});
