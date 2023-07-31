import { group, IListenable, inherit, InheritEventMap, source } from '@jujulego/event-tree';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import kill from 'tree-kill';

import { Task, TaskContext, TaskEventMap, TaskOptions } from './task';

// Types
export type SpawnTaskStream = 'stdout' | 'stderr';
export type SpawnTaskEnv = Partial<Record<string, string>>;

export interface SpawnTaskOptions extends TaskOptions {
  cwd?: string;
  env?: SpawnTaskEnv;
}

export interface SpawnTaskStreamEvent<S extends SpawnTaskStream = SpawnTaskStream> {
  stream: S;
  data: Buffer;
}

export type SpawnTaskEventMap = InheritEventMap<TaskEventMap, {
  stream: SpawnTaskStreamEvent;
  'stream.stdout': SpawnTaskStreamEvent<'stdout'>;
  'stream.stderr': SpawnTaskStreamEvent<'stderr'>;
}>;

// Class
export class SpawnTask<C extends TaskContext = TaskContext> extends Task<C> implements IListenable<SpawnTaskEventMap> {
  // Attributes
  private _process?: cp.ChildProcess;
  private _exitCode: number | null = null;

  readonly cwd: string;
  readonly env: SpawnTaskEnv;

  protected readonly _spawnEvents = inherit(this._taskEvents,  {
    stream: group({
      stdout: source<SpawnTaskStreamEvent<'stdout'>>(),
      stderr: source<SpawnTaskStreamEvent<'stderr'>>(),
    })
  });

  // Statics
  private static _buildId(cmd: string, args: readonly string[], cwd?: string): string {
    const hash = crypto.createHash('md5');

    hash.update(path.resolve(cwd ?? '.'));
    hash.update(cmd);

    for (const arg of args) {
      hash.update(arg);
    }

    return hash.digest('hex');
  }

  // Constructor
  constructor(
    readonly cmd: string,
    readonly args: readonly string[],
    context: C,
    opts: SpawnTaskOptions = {}
  ) {
    super(context, {
      ...opts,
      id: opts.id ?? SpawnTask._buildId(cmd, args, opts.cwd),
    });

    // Parse options
    this.cwd = opts.cwd ?? process.cwd();
    this.env = opts.env ?? {};
  }

  // Methods
  readonly on = this._spawnEvents.on;
  readonly off = this._spawnEvents.off;
  readonly clear = this._spawnEvents.clear;

  protected _start(): void {
    this._process = cp.execFile(this.cmd, this.args, {
      cwd: this.cwd,
      shell: true,
      windowsHide: true,
      env: {
        ...process.env,
        ...this.env,
      }
    });

    this._process.stdout?.on('data', (data: Buffer) => {
      this._spawnEvents.emit('stream.stdout', { stream: 'stdout', data });
    });

    this._process.stderr?.on('data', (data: Buffer) => {
      this._spawnEvents.emit('stream.stderr', { stream: 'stderr', data });
    });

    this._process.on('close', (code, signal) => {
      this._exitCode = code;

      if (code) {
        this.setStatus('failed');
      } else {
        this.setStatus('done');
      }

      if (signal) {
        this._logger.verbose(`${this.name} was ended by signal ${signal}`);
      }
    });

    this._process.on('error', (err) => {
      this._logger.warn(`Error while spawning ${this.name}: ${err}`);
      this.setStatus('failed');
    });
  }

  protected _stop(): void {
    if (this._process?.pid) {
      kill(this._process.pid, 'SIGTERM', (err) => {
        if (err) {
          this._logger.warn(`Failed to kill ${this.name}: ${err}`);
        } else {
          this._logger.debug(`Killed ${this.name}`);
        }
      });
    }
  }

  // Properties
  get name(): string {
    return [this.cmd, ...this.args].join(' ');
  }

  get exitCode(): number | null {
    return this._exitCode;
  }
}
