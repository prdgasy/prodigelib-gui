import { ButtonClass } from "./button";

export type Macroable<T> = T | MacroArgClass;

export class MacroArgClass {
  static id = 0;
  key: string;
  rawValue: () => any;
  constructor(value: any) {
    this.key = `macroArg_${String((MacroArgClass.id++))}`;
    this.rawValue = value;
  }


  get value(): any {
    return this.rawValue();
  }

  toString(): string {
    if (ButtonClass.currentButton) {
      ButtonClass.currentButton.inject(this);
    } else {
      ButtonClass.pendingArgs.push(this);
    }
    return `$(${this.key})`;
  }
}

export function Macro<T>(value: () => T extends (void) ? never : T): MacroArgClass {
  if (value instanceof MacroArgClass) throw Error(`${value} is already a Macro.`);

  if (typeof value === 'function') return new MacroArgClass(value);


  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') throw new Error(`[Prodigelib GUI] Macro is not necessary here.`);

  throw new Error(
    `[Prodigelib GUI] Sandstone objects must be wrapped in a function inside $().\n` +
    `  - Correct:   $(() => playerKills) or $(() => playerKills["++"])\n` +
    `  - Incorrect: $(playerKills) or $(playerKills["++"])`
  );
}