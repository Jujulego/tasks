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
      const dep = task$({ onStart: vi.fn() });
      const task = task$({ onStart: vi.fn() });

      task.dependsOn(dep);

      expect(task.dependencies).toEqual([dep]);
      expect(task.state).toBe(TaskState.Blocked);
    });

    it('should add the successful dependency and keep task state', () => {
      const dep = task$({ onStart: vi.fn() });
      const task = task$({ onStart: vi.fn() });

      vi.spyOn(dep, 'state$', 'get').mockReturnValue(var$(TaskState.Succeeded));

      task.dependsOn(dep);

      expect(task.dependencies).toEqual([dep]);
      expect(task.state).toBe(TaskState.Ready);
    });

    it('should update task state to ready when dependency succeeds', () => {
      const dep = task$({ onStart: vi.fn() });
      const task = task$({ onStart: vi.fn() });

      const depState$ = var$(TaskState.Ready);
      vi.spyOn(dep, 'state$', 'get').mockReturnValue(depState$);

      task.dependsOn(dep);
      depState$.mutate(TaskState.Succeeded);

      expect(task.state).toBe(TaskState.Ready);
    });

    it('should keep task state on blocked when dependency fails', () => {
      const dep = task$({ onStart: vi.fn() });
      const task = task$({ onStart: vi.fn() });

      const depState$ = var$(TaskState.Ready);
      vi.spyOn(dep, 'state$', 'get').mockReturnValue(depState$);

      task.dependsOn(dep);
      depState$.mutate(TaskState.Failed);

      expect(task.state).toBe(TaskState.Blocked);
    });

    it('should throw if task is not waiting', async () => {
      const dep = task$({ onStart: vi.fn() });
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
  });
});
