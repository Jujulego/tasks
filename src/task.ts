import { EventSource } from '@jujulego/event-tree';

import { ILogger } from './logger';

// Types
export type TaskContext = Record<string, any>;
export interface TaskOptions {
  logger?: ILogger;
}

export type TaskStatus = 'blocked' | 'ready' | 'running' | 'done' | 'failed';
export interface TaskStatusEvent {
  previous: TaskStatus;
  status: TaskStatus;
}

export type TaskEventMap = Record<`status.${TaskStatus}`, TaskStatusEvent>;

// Class
export abstract class Task<C extends TaskContext = TaskContext, M extends TaskEventMap = TaskEventMap> extends EventSource<M> {
  // Attributes
  private _status: TaskStatus = 'ready';
  private _dependencies: Task<C>[] = [];

  protected readonly _logger: ILogger;

  // Constructor
  protected constructor(readonly context: Readonly<C>, opts: TaskOptions = {}) {
    super();

    this._logger = opts.logger ?? console;
  }

  // Methods
  protected abstract _start(): void;
  protected abstract _stop(): void;

  // Properties
  abstract get name(): string;

  get status(): TaskStatus {
    return this._status;
  }

  protected set status(status: TaskStatus) {
    // Ignore no change
    if (this._status === status) {
      return;
    }

    // Update, log and emit
    const previous = this._status;
    this._status = status;

    this._logger.debug(`${this.name} is ${status}`);
    this.emit(`status.${status}`, { previous, status });
  }
}
