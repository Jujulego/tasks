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
    expect(job.exitCode).toBeNull();

    // Start process
    job.start();

    expect(job.state()).toBe(WorkloadState.Starting);
    expect(job.exitCode).toBeNull();

    await vi.waitFor(() => expect(job.state()).toBe(WorkloadState.Succeeded));
    expect(job.exitCode).toBe(0);

    // Read stdout stream
    await expect(text(job.stdout)).resolves.toBe(`Hello World!${EOL}`);
  });

  it('should spawn failing process', async () => {
    // Initiate
    const task = spawn$('exit', ['1']);

    expect(task.state()).toBe(WorkloadState.Ready);
    expect(task.exitCode).toBeNull();

    // Start process
    task.start();

    expect(task.state()).toBe(WorkloadState.Starting);
    expect(task.exitCode).toBeNull();

    await vi.waitFor(() => expect(task.state()).toBe(WorkloadState.Failed));
    expect(task.exitCode).toBe(1);
  });
});
