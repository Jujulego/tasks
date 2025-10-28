export interface NonNullObject extends Record<number | string | symbol, unknown> {}
export type PredicateFn<in D, out R extends D> = (data: D) => data is R;
