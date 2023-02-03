// Types
export interface ReadyMessage {
  readonly type: 'ready';
}

export interface RunMessage {
  readonly type: 'run';
  readonly payload: unknown;
}

export interface EventMessage {
  readonly type: 'event';
  readonly payload: unknown;
}

export interface SuccessMessage {
  readonly type: 'success';
}

export interface FailureMessage {
  readonly type: 'failure';
  readonly error: unknown;
}
