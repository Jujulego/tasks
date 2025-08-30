import { spawn$ } from '@/src/spawn$.js';
import { TaskState } from '@/src/task-state.js';
import { EOL } from 'node:os';
import { text } from 'node:stream/consumers';
import { describe, expect, it, vi } from 'vitest';

// Tests
describe('spawn$', () => {
  it('should spawn process, and track it\'s state', async () => {
    // Initiate
    const task = spawn$('echo', ['Hello World!']);

    expect(task.state).toBe(TaskState.Ready);
    expect(task.exitCode).toBeNull();

    // Start process
    await task.start();

    expect(task.state).toBe(TaskState.Starting);
    expect(task.exitCode).toBeNull();

    await vi.waitFor(() => expect(task.state).toBe(TaskState.Succeeded));
    expect(task.exitCode).toBe(0);

    // Read stdout stream
    await expect(text(task.stdout)).resolves.toBe(`Hello World!${EOL}`);
  });

  it('should spawn failing process', async () => {
    // Initiate
    const task = spawn$('exit', ['1']);

    expect(task.state).toBe(TaskState.Ready);
    expect(task.exitCode).toBeNull();

    // Start process
    await task.start();

    expect(task.state).toBe(TaskState.Starting);
    expect(task.exitCode).toBeNull();

    await vi.waitFor(() => expect(task.state).toBe(TaskState.Failed));
    expect(task.exitCode).toBe(1);
  });
});
