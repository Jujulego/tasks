import { isTaskActive, isTaskCompleted, isTaskWaiting, TaskState } from '@/src/index.js';
import { describe, expect, it } from 'vitest';

describe('isTaskWaiting', () => {
  it.each([
    TaskState.Blocked,
    TaskState.Ready,
  ])('should return true for "%s"', (state) => {
    expect(isTaskWaiting(state)).toBe(true);
  });

  it.each([
    TaskState.Starting,
    TaskState.Running,
    TaskState.Succeeded,
    TaskState.Failed,
    TaskState.Canceling,
    TaskState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isTaskWaiting(state)).toBe(false);
  });
});

describe('isTaskActive', () => {
  it.each([
    TaskState.Starting,
    TaskState.Running,
    TaskState.Canceling,
  ])('should return true for "%s"', (state) => {
    expect(isTaskActive(state)).toBe(true);
  });

  it.each([
    TaskState.Blocked,
    TaskState.Ready,
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
    TaskState.Blocked,
    TaskState.Ready,
    TaskState.Starting,
    TaskState.Running,
    TaskState.Canceling,
    TaskState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isTaskCompleted(state)).toBe(false);
  });
});
