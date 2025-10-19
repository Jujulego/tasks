import { group$, inherit$, multiplexer$, source$ } from 'kyrielle';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import kill from 'tree-kill';
import { Task, type TaskContext, type TaskOptions } from './task.js';

/**
 * Spawns a process.
 *
 * @deprecated use {@link spawn$} instead
 */
export class SpawnTask<C extends TaskContext = TaskContext> extends Task<C> {
  // Attributes
  private _process?: cp.ChildProcess;
  private _exitCode: number | null = null;

  readonly cwd: string;
  readonly env: SpawnTaskEnv;

  protected readonly spawnEvents$ = multiplexer$({
    stream: group$({
      stdout: source$<SpawnTaskEventStream<'stdout'>>(),
      stderr: source$<SpawnTaskEventStream<'stderr'>>(),
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
  protected onStart(): void {
    this._process = cp.execFile(this.cmd, this.args, {
      cwd: this.cwd,
      shell: true,
      windowsHide: true,
      env: {
        ...process.env,
        ...this.env,
      }
    });

    this._process.on('spawn', () => {
      this.setStatus('running');
    });

    this._process.stdout?.on('data', (data: Buffer) => {
      this.spawnEvents$.emit('stream.stdout', { stream: 'stdout', data });
    });

    this._process.stderr?.on('data', (data: Buffer) => {
      this.spawnEvents$.emit('stream.stderr', { stream: 'stderr', data });
    });

    this._process.on('close', (code, signal) => {
      this._exitCode = code;

      if (code) {
        this.setStatus('failed');
      } else {
        this.setStatus('done');
      }

      if (signal) {
        this.logger$.verbose(`${this.name} was ended by signal ${signal}`);
      }
    });

    this._process.on('error', (err) => {
      this.logger$.warning(`Error while spawning ${this.name}`, err);
      this.setStatus('failed');
    });
  }

  protected onStop(): void {
    if (this._process?.pid) {
      kill(this._process.pid, 'SIGTERM', (err) => {
        if (err) {
          this.logger$.warning(`Failed to kill ${this.name}`, err);
        } else {
          this.logger$.debug(`Killed ${this.name}`);
        }
      });
    }
  }

  // Properties
  get events$() {
    return inherit$(this.taskEvents$, this.spawnEvents$);
  }

  get name(): string {
    return [this.cmd, ...this.args].join(' ');
  }

  get exitCode(): number | null {
    return this._exitCode;
  }
}

// Types
export type SpawnTaskStream = 'stdout' | 'stderr';
export type SpawnTaskEnv = Partial<Record<string, string>>;

export interface SpawnTaskEventStream<S extends SpawnTaskStream = SpawnTaskStream> {
  readonly stream: S;
  readonly data: Buffer;
}

export interface SpawnTaskOptions extends TaskOptions {
  readonly cwd?: string;
  readonly env?: SpawnTaskEnv;
}
