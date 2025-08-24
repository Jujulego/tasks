import { task$ } from '@/src/task$.js';
import { TaskState } from '@/src/task-state.js';
import { describe, expect, it, vi } from 'vitest';

describe('task$', () => {
  it('should create a task in ready state, with defaults applied', () => {
    const task = task$({ onStart: vi.fn() });

    expect(task.id).toBeDefined();
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
});
