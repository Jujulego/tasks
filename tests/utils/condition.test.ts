import { Condition, ConditionEventMap } from '../../src/utils/condition';
import { EventGroupListener } from '@jujulego/event-tree';
import util from 'util';

// Setup
let value: number;
let condition: Condition;

let resultSpy: EventGroupListener<ConditionEventMap, 'result'>;

beforeEach(() => {
  // Initiate
  value = 0;
  condition = new Condition(() => value === 1);

  // Events
  resultSpy = jest.fn();
  condition.subscribe('result', resultSpy);
});

// Tests
describe('new Condition', () => {
  it('should have computed initial condition value', () => {
    expect(condition.value).toBe(false);
  });
});

describe('Condition.check', () => {
  it('should recompute value and emit event (=> true)', () => {
    value = 1;

    condition.check();
    expect(condition.value).toBe(true);

    expect(resultSpy).toHaveBeenCalledTimes(1);
    expect(resultSpy).toHaveBeenCalledWith(true, { key: 'result.true', origin: condition });
  });

  it('should recompute value and emit event (=> false)', () => {
    value = 2;

    condition.check();
    expect(condition.value).toBe(false);

    expect(resultSpy).toHaveBeenCalledTimes(1);
    expect(resultSpy).toHaveBeenCalledWith(false, { key: 'result.false', origin: condition });
  });
});

describe('Condition.waitFor', () => {
  it('should resolve when condition result matches value', async () => {
    const prom = condition.waitFor(true);

    // prom should still be pending
    expect(util.inspect(prom)).toMatch(/pending/);

    value = 1;
    condition.check();

    await expect(prom).resolves.toBeUndefined();
  });

  it('should resolve instantaneously if value already matches', async () => {
    value = 1;
    condition.check();

    const prom = condition.waitFor(true);
    await expect(prom).resolves.toBeUndefined();
  });
});
