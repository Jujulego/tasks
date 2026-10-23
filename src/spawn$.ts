import { filter$, type Observable, once$, pipe$, type Ref, var$ } from 'kyrielle';
import { execFile } from 'node:child_process';
import { PassThrough, type Readable } from 'node:stream';
import { isWorkloadEnded, WorkloadState } from './enums/workload-state.js';
import { type Job$, job$, type JobProps } from './job$.js';

/**
 * Creates a job spawning a process in a shell.
 *
 * @since 3.0.0
 */
export function spawn$(cmd: string, args: readonly string[], props: SpawnProps = {}): SpawnJob$ {
  const { cwd = process.cwd(), env = {}, ...rest } = props;
  const exitCode$ = var$<number>();
  const stdout = new PassThrough({ allowHalfOpen: false });
  const stderr = new PassThrough({ allowHalfOpen: false });

  const job = job$({
    label: [cmd, ...args].join(' '),
    type: 'spawn',
    ...rest,
    onStart({ signal, setState }) {
      // TODO: escape args & pass them as string, to resolve DEP0190
      const spawned = execFile(cmd, args, {
        shell: true,
        windowsHide: true,
        signal,
        killSignal: 'SIGTERM',
        cwd,
        env: { ...process.env, ...env },
      });

      spawned.once('spawn', () => setState(WorkloadState.Running));
      spawned.once('error', () => setState(WorkloadState.Failed));
      spawned.once('close', (code) => {
        if (code === 0) {
          setState(WorkloadState.Succeeded);
        } else {
          setState(WorkloadState.Failed);
        }

        if (code !== null) {
          exitCode$.mutate(code);
        }
      });

      spawned.stdout!.pipe(stdout);
      spawned.stderr!.pipe(stderr);
    }
  });

  const ended$ = pipe$(job.state$, filter$(isWorkloadEnded));
  once$(ended$, () => {
    stdout.end();
    stderr.end();
  });

  return {
    ...job,
    cmd,
    args,
    cwd,
    env,
    exitCode$,
    stderr,
    stdout,
    exitCode: () => exitCode$.defer() ?? null
  };
}

export interface SpawnJob$ extends Job$ {
  readonly cmd: string;
  readonly args: readonly string[];

  /**
   * Directory where to run the command
   */
  readonly cwd: string | undefined;

  /**
   * Environment variables. Will be merged with `process.env`.
   */
  readonly env: Readonly<Record<string, string>>;

  /**
   * Spawned process stdout stream.
   */
  readonly stdout: Readable;

  /**
   * Spawned process stderr stream.
   */
  readonly stderr: Readable;

  /**
   * Spawned process exit code.
   */
  exitCode(this: void): number | null;

  /**
   * Reference on spawned process exit code.
   */
  readonly exitCode$: Ref<number | undefined> & Observable<number>;
}

export interface SpawnProps extends Omit<JobProps, 'label' | 'onStart' | 'onCancel'> {
  /**
   * Friendly name of the workload
   */
  readonly label?: string;

  /**
   * Directory where to run the command
   */
  readonly cwd?: string;

  /**
   * Environment variables. Will be merged with `process.env`.
   */
  readonly env?: Record<string, string>;
}
