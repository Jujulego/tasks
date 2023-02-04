// Types
export interface Message<T extends string> {
  readonly type: T;
}

export type TaskMessage = RunMessage;
export type HandlerMessage = ReadyMessage | EventMessage | SuccessMessage | FailureMessage;

export type ReadyMessage = Message<'ready'>;
export type SuccessMessage = Message<'success'>;

export interface RunMessage extends Message<'run'> {
  readonly payload: unknown;
}

export interface EventMessage extends Message<'event'> {
  readonly payload: unknown;
}

export interface FailureMessage extends Message<'failure'> {
  readonly error: unknown;
}
