import { isTaskActive, isTaskCompleted, isTaskWaiting, TaskState } from '@/src/task-state.js';
import { describe, expect, it } from 'vitest';

describe('isTaskWaiting', () => {
  it.each([
    TaskState.Created,
    TaskState.Blocked,
    TaskState.Queued,
  ])('should return true for "%s"', (state) => {
    expect(isTaskWaiting(state)).toBe(true);
  });

  it.each([
    TaskState.Starting,
    TaskState.Running,
    TaskState.Succeeded,
    TaskState.Failed,
    TaskState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isTaskWaiting(state)).toBe(false);
  });
});

describe('isTaskActive', () => {
  it.each([
    TaskState.Starting,
    TaskState.Running,
  ])('should return true for "%s"', (state) => {
    expect(isTaskActive(state)).toBe(true);
  });

  it.each([
    TaskState.Created,
    TaskState.Blocked,
    TaskState.Queued,
    TaskState.Succeeded,
    TaskState.Failed,
    TaskState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isTaskActive(state)).toBe(false);
  });
});

describe('isTaskCompleted', () => {
  it.each([
    TaskState.Succeeded,
    TaskState.Failed,
  ])('should return true for "%s"', (state) => {
    expect(isTaskCompleted(state)).toBe(true);
  });

  it.each([
    TaskState.Created,
    TaskState.Blocked,
    TaskState.Queued,
    TaskState.Starting,
    TaskState.Running,
    TaskState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isTaskCompleted(state)).toBe(false);
  });
});
