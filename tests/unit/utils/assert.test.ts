import { assert } from '@/src/utils/assert.js';
import { describe, expect, it } from 'vitest';

// Tests
describe('assert', () => {
  it('should return as condition is true', () => {
    expect(assert(true, 'Assertion is not true')).toBeUndefined();
  });

  it('should throw as condition is false', () => {
    expect(() => assert(false, 'Assertion is not true')).toThrowError('Assertion is not true');
  });
});
