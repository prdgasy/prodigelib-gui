import { ButtonClass } from "./button";

export type Macroable<T> = T | MacroArgClass;

export class MacroArgClass {
  static id = 0;
  static registry = new Map<string, MacroArgClass>();

  key: string;
  rawValue: () => any;
  constructor(value: any) {
    this.key = `macroArg_${String((MacroArgClass.id++))}`;
    this.rawValue = typeof value === 'function' ? value : () => value;

    MacroArgClass.registry.set(this.key, this);
  }

  get value(): any {
    return this.rawValue();
  }

  toString(): string {
    return `$(${this.key})`;
  }
}

export function MacroArg(strings: TemplateStringsArray, ...values: any[]): string;
export function MacroArg(value: any): MacroArgClass;
export function MacroArg(stringsOrValue: any, ...values: any[]): any {
  if (Array.isArray(stringsOrValue) && 'raw' in stringsOrValue) {
    const strings = stringsOrValue as unknown as TemplateStringsArray;
    let result = strings[0];

    for (let i = 0; i < values.length; i++) {
      let val = values[i];

      if (val instanceof MacroArgClass) {
      } else if (typeof val === 'function' || (val !== null && typeof val === 'object' && !Array.isArray(val))) {
        val = new MacroArgClass(val);
      }
      result += String(val) + strings[i + 1];
    }

    return result;
  } else if (stringsOrValue instanceof MacroArgClass) {
    throw Error(`${stringsOrValue} is already a Macro.`);
  }

  return new MacroArgClass(stringsOrValue);
}