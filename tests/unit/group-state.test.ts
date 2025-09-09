import { isGroupActive, isGroupCompleted, isGroupWaiting, GroupState } from '@/src/index.js';
import { describe, expect, it } from 'vitest';

describe('isGroupWaiting', () => {
  it.each([
    GroupState.Blocked,
    GroupState.Ready,
  ])('should return true for "%s"', (state) => {
    expect(isGroupWaiting(state)).toBe(true);
  });

  it.each([
    GroupState.Running,
    GroupState.Succeeded,
    GroupState.Failed,
    GroupState.Canceling,
    GroupState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isGroupWaiting(state)).toBe(false);
  });
});

describe('isGroupActive', () => {
  it.each([
    GroupState.Running,
    GroupState.Canceling,
  ])('should return true for "%s"', (state) => {
    expect(isGroupActive(state)).toBe(true);
  });

  it.each([
    GroupState.Blocked,
    GroupState.Ready,
    GroupState.Succeeded,
    GroupState.Failed,
    GroupState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isGroupActive(state)).toBe(false);
  });
});

describe('isGroupCompleted', () => {
  it.each([
    GroupState.Succeeded,
    GroupState.Failed,
  ])('should return true for "%s"', (state) => {
    expect(isGroupCompleted(state)).toBe(true);
  });

  it.each([
    GroupState.Blocked,
    GroupState.Ready,
    GroupState.Running,
    GroupState.Canceling,
    GroupState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isGroupCompleted(state)).toBe(false);
  });
});
