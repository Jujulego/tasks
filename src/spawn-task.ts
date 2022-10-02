import cp from 'node:child_process';
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

export type SpawnTaskEventMap = TaskEventMap & {
  'stream.stdout': SpawnTaskStreamEvent<'stdout'>;
  'stream.stderr': SpawnTaskStreamEvent<'stderr'>;
};

// Class
export class SpawnTask<C extends TaskContext = TaskContext, M extends SpawnTaskEventMap = SpawnTaskEventMap> extends Task<C, M> {
  // Attributes
  private _process?: cp.ChildProcess;
  private _exitCode: number | null = null;

  readonly cwd: string;
  readonly env: SpawnTaskEnv;

  // Constructor
  constructor(
    readonly cmd: string,
    readonly args: readonly string[],
    context: Readonly<C>,
    opts: SpawnTaskOptions = {}
  ) {
    super(context, opts);

    // Parse options
    this.cwd = opts.cwd ?? process.cwd();
    this.env = opts.env ?? {};
  }

  // Methods
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
      this.emit('stream.stdout', { stream: 'stdout', data });
    });

    this._process.stderr?.on('data', (data: Buffer) => {
      this.emit('stream.stderr', { stream: 'stderr', data });
    });

    this._process.on('close', (code, signal) => {
      this._exitCode = code;

      if (code) {
        this.status = 'failed';
      } else {
        this.status = 'done';
      }

      if (signal) {
        this._logger.verbose(`${this.name} was ended by signal ${signal}`);
      }
    });

    this._process.on('error', (err) => {
      this._logger.warn(`Error while spawning ${this.name}: ${err}`);
      this.status = 'failed';
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
