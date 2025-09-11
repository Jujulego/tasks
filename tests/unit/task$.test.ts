import { node$ } from '@/src/bases/node$.js';
import { task$, type TaskOnStartProps, TaskState } from '@/src/index.js';
import { var$ } from 'kyrielle';
import { describe, expect, it, vi } from 'vitest';

describe('task$', () => {
  it('should create a task in ready state, with defaults applied', () => {
    const task = task$({ onStart: vi.fn() });

    expect(task.id).toBeDefined();
    expect(task.dependencies).toHaveLength(0);
    expect(task.state).toBe(TaskState.Ready);
    expect(task.weight).toBe(1);
  });

  it('should apply given id', () => {
    const task = task$({ id: 'life', onStart: vi.fn() });

    expect(task.id).toBe('life');
  });

  it('should apply given weight', () => {
    const task = task$({ weight: 42, onStart: vi.fn() });

    expect(task.weight).toBe(42);
  });

  describe('dependsOn', () => {
    it('should add dependency and change task state to blocked', () => {
      const dep = node$({ completed$: var$() });
      const task = task$({ onStart: vi.fn() });

      task.dependsOn(dep);

      expect(task.dependencies).toEqual([dep]);
      expect(task.state).toBe(TaskState.Blocked);
    });

    it('should add the successful dependency and keep task state', () => {
      const dep = node$({ completed$: var$(true) });
      const task = task$({ onStart: vi.fn() });

      task.dependsOn(dep);

      expect(task.dependencies).toEqual([dep]);
      expect(task.state).toBe(TaskState.Ready);
    });

    it('should update task state to ready when dependency succeeds', () => {
      const completed$ = var$<boolean>();
      const dep = node$({ completed$ });
      const task = task$({ onStart: vi.fn() });

      task.dependsOn(dep);
      completed$.mutate(true);

      expect(task.state).toBe(TaskState.Ready);
    });

    it('should keep task state on blocked when dependency fails', () => {
      const completed$ = var$<boolean>();
      const dep = node$({ completed$ });
      const task = task$({ onStart: vi.fn() });

      task.dependsOn(dep);
      completed$.mutate(false);

      expect(task.state).toBe(TaskState.Blocked);
    });

    it('should throw if task is not waiting', async () => {
      const dep = node$({ completed$: var$() });
      const task = task$({ onStart: vi.fn() });

      await task.start();
      expect(() => task.dependsOn(dep)).toThrow(new Error('Cannot add dependency to task in "starting" state.'));

      expect(task.dependencies).toHaveLength(0);
    });
  });

  describe('start', () => {
    it('should update task state to starting and call onStart callback', async () => {
      const onStart = vi.fn();
      const task = task$({ onStart });

      await task.start();

      expect(task.state).toBe(TaskState.Starting);
      expect(onStart).toHaveBeenCalled();
    });

    it.each([
      TaskState.Running,
      TaskState.Succeeded,
      TaskState.Failed,
    ] as const)('should apply running state as triggerred by onStart callback', async (state) => {
      const onStart = vi.fn(({ setState }: TaskOnStartProps) => setState(state));
      const task = task$({ onStart });

      await task.start();

      expect(task.state).toBe(state);
    });

    it('should update task state to failed if onStart callback throws', async () => {
      const onStart = vi.fn(() => {
        throw new Error('Test');
      });
      const task = task$({ onStart });

      await expect(task.start()).rejects.toThrow(new Error('Test'));

      expect(task.state).toBe(TaskState.Failed);
    });

    it('should throw if task is not waiting', async () => {
      const task = task$({ onStart: vi.fn() });

      await task.start();
      await expect(task.start()).rejects.toThrow(new Error('Task in "starting" state cannot be started.'));
    });
  });

  describe('cancel', () => {
    it('should update task state to cancelled and trigger onStart signal', async () => {
      const onStart = vi.fn<(props: TaskOnStartProps) => void>();
      const task = task$({ onStart });

      // First start the task
      await task.start();

      const { signal } = onStart.mock.calls[0]![0];
      expect(signal.aborted).toBe(false);

      // Then cancel it !
      await task.cancel();

      expect(task.state).toBe(TaskState.Canceled);
      expect(signal.aborted).toBe(true);
    });

    it('should call onCancel callback', async () => {
      expect.assertions(3);

      const onCancel = vi.fn(() => {
        expect(task.state).toBe(TaskState.Canceling);
      });
      const task = task$({ onStart: vi.fn(), onCancel });

      await task.start();
      await task.cancel();

      expect(task.state).toBe(TaskState.Canceled);
      expect(onCancel).toHaveBeenCalled();
    });
  });
});
