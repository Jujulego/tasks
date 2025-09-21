import { isJobActive, isJobCompleted, isJobWaiting, JobState } from '@/src/index.js';
import { describe, expect, it } from 'vitest';

describe('isJobWaiting', () => {
  it.each([
    JobState.Blocked,
    JobState.Ready,
  ])('should return true for "%s"', (state) => {
    expect(isJobWaiting(state)).toBe(true);
  });

  it.each([
    JobState.Starting,
    JobState.Running,
    JobState.Succeeded,
    JobState.Failed,
    JobState.Canceling,
    JobState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isJobWaiting(state)).toBe(false);
  });
});

describe('isJobActive', () => {
  it.each([
    JobState.Starting,
    JobState.Running,
    JobState.Canceling,
  ])('should return true for "%s"', (state) => {
    expect(isJobActive(state)).toBe(true);
  });

  it.each([
    JobState.Blocked,
    JobState.Ready,
    JobState.Succeeded,
    JobState.Failed,
    JobState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isJobActive(state)).toBe(false);
  });
});

describe('isJobCompleted', () => {
  it.each([
    JobState.Succeeded,
    JobState.Failed,
  ])('should return true for "%s"', (state) => {
    expect(isJobCompleted(state)).toBe(true);
  });

  it.each([
    JobState.Blocked,
    JobState.Ready,
    JobState.Starting,
    JobState.Running,
    JobState.Canceling,
    JobState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isJobCompleted(state)).toBe(false);
  });
});
