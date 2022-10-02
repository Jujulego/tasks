import cp from 'node:child_process';
import { EventEmitter } from 'node:events';
import kill from 'tree-kill';

import { SpawnTask, SpawnTaskStreamEvent } from '../src';
import { spyLogger } from './utils';

// Mocks
jest.mock('tree-kill');

// Setup
let task: SpawnTask;
let proc: cp.ChildProcess;

const streamEventSpy = jest.fn<void, [SpawnTaskStreamEvent]>();

beforeEach(() => {
  task = new SpawnTask('test', ['-a', '--arg'], {}, { logger: spyLogger });

  jest.resetAllMocks();
  jest.restoreAllMocks();

  task.subscribe('stream', streamEventSpy);

  // Mock execFile
  proc = new EventEmitter() as cp.ChildProcess;
  Object.assign(proc, {
    pid: -1,
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
  });

  jest.spyOn(cp, 'execFile').mockReturnValue(proc);
});

// Tests
describe('SpawnTask.start', () => {
  it('should spawn a new process using execFile', () => {
    task.start();

    expect(cp.execFile).toHaveBeenCalledWith('test', ['-a', '--arg'], {
      cwd: process.cwd(),
      shell: true,
      windowsHide: true,
      env: process.env
    });
  });

  it('should emit data from process\'s stdout', () => {
    task.start();

    const buf = Buffer.from('test stdout');
    proc.stdout?.emit('data', buf);

    expect(streamEventSpy).toHaveBeenCalledWith(
      { stream: 'stdout', data: buf },
      { key: 'stream.stdout', origin: task }
    );
  });

  it('should emit data from process\'s stderr', () => {
    task.start();

    const buf = Buffer.from('test stderr');
    proc.stderr?.emit('data', buf);

    expect(streamEventSpy).toHaveBeenCalledWith(
      { stream: 'stderr', data: buf },
      { key: 'stream.stderr', origin: task }
    );
  });

  it('should put task into done status when process completes with 0 exit code', () => {
    task.start();
    proc.emit('close', 0);

    expect(task.status).toBe('done');
    expect(task.exitCode).toBe(0);
  });

  it('should put task into failed status when process completes with 1 exit code', () => {
    task.start();
    proc.emit('close', 1);

    expect(task.status).toBe('failed');
    expect(task.exitCode).toBe(1);
  });

  it('should log if process was ended by a signal', () => {
    task.start();
    proc.emit('close', 1, 'SIGTERM');

    expect(task.status).toBe('failed');
    expect(task.exitCode).toBe(1);
    expect(spyLogger.verbose).toHaveBeenCalledWith(`${task.name} was ended by signal SIGTERM`);
  });

  it('should put task into failed status if process failed to spawn', () => {
    task.start();
    proc.emit('error', 'Failed !');

    expect(task.status).toBe('failed');
    expect(task.exitCode).toBeNull();
    expect(spyLogger.warn).toHaveBeenCalledWith(`Error while spawning ${task.name}: Failed !`);
  });
});

describe('SpawnTask.stop', () => {
  beforeEach(() => {
    task.start();
  });

  it('should use tree-kill to kill process', () => {
    task.stop();

    expect(kill).toHaveBeenCalledWith(proc.pid, 'SIGTERM', expect.any(Function));

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const cb = jest.mocked(kill).mock.calls[0][2]!;
    cb();

    expect(spyLogger.debug).toHaveBeenCalledWith(`Killed ${task.name}`);
  });

  it('should log error if failed to kill process', () => {
    task.stop();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const cb = jest.mocked(kill).mock.calls[0][2]!;
    cb(new Error('Failed !'));

    expect(spyLogger.warn).toHaveBeenCalledWith(`Failed to kill ${task.name}: Error: Failed !`);
  });
});

describe('SpawnTask.name', () => {
  it('should return joined command with arguments', () => {
    expect(task.name).toBe('test -a --arg');
  });
});
