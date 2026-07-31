import { ButtonClass } from "./button";

export type Macroable<T> = T | MacroArgClass;

export class MacroArgClass {
  static id = 0;
  key: string;
  value: any;

  constructor(value: any) {
    this.key = `macroArg_${String((MacroArgClass.id++))}`;
    this.value = value;
  }

  toString() {
    ButtonClass.currentButton.inject(this);
    return `$(${this.key})`;
  }
}

export function Macro(value: any): MacroArgClass {
  return new MacroArgClass(value);
}