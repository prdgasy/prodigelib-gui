import { ButtonClass } from "./button";

export type Macroable<T> = T | MacroArgClass;

export class MacroArgClass {
  static id = 0;
  key: string;
  rawValue: () => any;
  constructor(value: any) {
    this.key = `macroArg_${String((MacroArgClass.id++))}`;
    this.rawValue = typeof value === 'function' ? value : () => value;
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

export function MacroArg(value: any): MacroArgClass {
  if (value instanceof MacroArgClass) {
    throw Error(`${value} is already a Macro.`);
  }

  return new MacroArgClass(value);

}