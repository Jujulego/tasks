import { isWorkloadActive, isWorkloadEnded, isWorkloadWaiting, WorkloadState } from '@/src/index.js';
import { describe, expect, it } from 'vitest';

// Tests
describe('isWorkloadWaiting', () => {
  it.each([
    WorkloadState.Blocked,
    WorkloadState.Ready,
  ])('should return true for "%s"', (state) => {
    expect(isWorkloadWaiting(state)).toBe(true);
  });

  it.each([
    WorkloadState.Starting,
    WorkloadState.Running,
    WorkloadState.Succeeded,
    WorkloadState.Failed,
    WorkloadState.Canceling,
    WorkloadState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isWorkloadWaiting(state)).toBe(false);
  });
});

describe('isWorkloadActive', () => {
  it.each([
    WorkloadState.Starting,
    WorkloadState.Running,
    WorkloadState.Canceling,
  ])('should return true for "%s"', (state) => {
    expect(isWorkloadActive(state)).toBe(true);
  });

  it.each([
    WorkloadState.Blocked,
    WorkloadState.Ready,
    WorkloadState.Succeeded,
    WorkloadState.Failed,
    WorkloadState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isWorkloadActive(state)).toBe(false);
  });
});

describe('isWorkloadEnded', () => {
  it.each([
    WorkloadState.Succeeded,
    WorkloadState.Failed,
    WorkloadState.Canceled,
  ])('should return true for "%s"', (state) => {
    expect(isWorkloadEnded(state)).toBe(true);
  });

  it.each([
    WorkloadState.Blocked,
    WorkloadState.Ready,
    WorkloadState.Starting,
    WorkloadState.Running,
    WorkloadState.Canceling,
  ])('should return false for "%s"', (state) => {
    expect(isWorkloadEnded(state)).toBe(false);
  });
});
