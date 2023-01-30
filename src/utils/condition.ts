import { EventSource, waitForEvent } from '@jujulego/event-tree';

// Types
export type ConditionEventMap = {
  'result.true': true,
  'result.false': false,
}

// Class
export class Condition extends EventSource<ConditionEventMap> {
  // Attributes
  private _value: boolean;

  // Constructor
  constructor(readonly condition: () => boolean) {
    super();

    this._value = condition();
  }

  // Methods
  check(): void {
    this._value = this.condition();
    this.emit(`result.${this._value}`, this._value);
  }

  async waitFor(value: boolean): Promise<void> {
    while (this._value !== value) {
      await waitForEvent(this, `result.${value}`);
    }
  }

  // Properties
  get value() {
    return this._value;
  }
}
