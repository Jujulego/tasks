import type { NonNullObject, PredicateFn } from '../types.js';

export function isNonNullObject(value: unknown): value is NonNullObject {
  return typeof value === 'object' && value !== null;
}

export function hasProperty<O extends NonNullObject, const K extends keyof O, T extends O[K]>(value: O, key: K, predicate: PredicateFn<O[K], T>): value is O & Record<K, O[K] & T> {
  return key in value && predicate(value[key]);
}

export function hasMethod<O extends NonNullObject, const K extends keyof O>(value: NonNullObject, key: K) {
  return hasProperty(value, key, (prop) => typeof prop === 'function');
}