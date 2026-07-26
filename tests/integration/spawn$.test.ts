import { WorkloadState, spawn$ } from '@/src/index.js';
import { EOL } from 'node:os';
import { text } from 'node:stream/consumers';
import { describe, expect, it, vi } from 'vitest';

// Tests
describe('spawn$', () => {
  it('should spawn process, and track it\'s state', async () => {
    // Initiate
    const job = spawn$('echo', ['Hello World!']);

    expect(job.state()).toBe(WorkloadState.Ready);
    expect(job.exitCode()).toBeNull();

    // Start process
    job.start();

    expect(job.state()).toBe(WorkloadState.Starting);
    expect(job.exitCode()).toBeNull();

    await vi.waitFor(() => expect(job.state()).toBe(WorkloadState.Succeeded));

    expect(job.exitCode()).toBe(0);
    await expect(text(job.stdout)).resolves.toBe(`Hello World!${EOL}`);
    await expect(text(job.stderr)).resolves.toBe('');
  });

  it('should spawn failing process', async () => {
    // Initiate
    const job = spawn$('exit', ['1']);

    expect(job.state()).toBe(WorkloadState.Ready);
    expect(job.exitCode()).toBeNull();

    // Start process
    job.start();

    expect(job.state()).toBe(WorkloadState.Starting);
    expect(job.exitCode()).toBeNull();

    await vi.waitFor(() => expect(job.state()).toBe(WorkloadState.Failed));

    expect(job.exitCode()).toBe(1);
    await expect(text(job.stdout)).resolves.toBe('');
    await expect(text(job.stderr)).resolves.toBe('');
  });

  it('should cancel spawned process', async () => {
    // Initiate
    const job = spawn$('node', ['-e', '"setTimeout(() => console.log(\'Hello world!\'), 1000)"']);

    expect(job.state()).toBe(WorkloadState.Ready);
    expect(job.exitCode()).toBeNull();

    // Start process
    job.start();

    expect(job.state()).toBe(WorkloadState.Starting);
    expect(job.exitCode()).toBeNull();

    await vi.waitFor(() => expect(job.state()).toBe(WorkloadState.Running));

    // Cancel process
    job.cancel();

    await vi.waitFor(() => expect(job.state()).toBe(WorkloadState.Canceled));

    expect(job.exitCode()).toBeNull();
    await expect(text(job.stdout)).resolves.toBe('');
    await expect(text(job.stderr)).resolves.toBe('');
  });
});
