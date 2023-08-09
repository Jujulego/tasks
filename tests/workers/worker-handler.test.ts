import { EventEmitter } from 'node:events';
import wt from 'node:worker_threads';
import { vi } from 'vitest';

import { WorkerHandlerTest } from './utils.js';

// Setup
let port: wt.MessagePort;
let handler: WorkerHandlerTest;

beforeEach(() => {
  port = new EventEmitter() as wt.MessagePort;

  Object.assign(port, {
    postMessage: vi.fn(),
  });

  handler = new WorkerHandlerTest();
});

// Tests
describe('WorkerHandler', () => {
  it('should call _run when receiving a message and send back result', async () => {
    handler.init(port);

    // Emit message to initiate work
    port.emit('message', { type: 'run', payload: { test: true } });

    expect(handler._run).toHaveBeenCalledWith({ test: true });

    expect(port.postMessage).toHaveBeenCalledWith({
      type: 'started',
    });

    // Should have posted success
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(port.postMessage).toHaveBeenCalledWith({
      type: 'success',
    });
  });

  it('should call _run when receiving a message and send back error', async () => {
    handler.init(port);

    // Emit message to initiate work
    vi.mocked(handler._run).mockRejectedValue(new Error('failed !'));
    port.emit('message', { type: 'run', payload: { test: true } });

    expect(handler._run).toHaveBeenCalledWith({ test: true });

    // Should have posted failure
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(port.postMessage).toHaveBeenCalledWith({
      type: 'failure',
      error: new Error('failed !'),
    });
  });
});

describe('WorkerHandler.emit', () => {
  it('should send message as event', () => {
    handler.init(port);
    handler.emit({ event: 'test' });

    expect(port.postMessage).toHaveBeenCalledWith({
      type: 'event',
      payload: { event: 'test' }
    });
  });

  it('should throw as handler is not not yet initialized', () => {
    expect(() => handler.emit({ event: 'test' }))
      .toThrow(new Error('Cannot send message, handler not yet initialized'));
  });
});
