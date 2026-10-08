import { DataPointClass, Score } from "sandstone";

export type Macroable<T> = T | MacroArgument | MacroTemplate;


/**
 * Représente un argument individuel de macro.
 *
 * Exemple :
 *   GuiMacro(Variable(1))
 *
 * devient :
 *   $(macro_arg_0)
 */
export class MacroArgument {
  static id = 0;

  public readonly key: string;
  private readonly value: () => any;

  constructor(value: any) {
    this.key = `macro_arg_${MacroArgument.id++}`;
    this.value = () => value;
  }

  public getValue(): any {
    return this.value();
  }

  public toString(): string {
    return `$(${this.key})`;
  }
}


/**
 * Représente une chaîne contenant éventuellement plusieurs macros.
 *
 * Exemple :
 *
 *   GuiMacro`num: ${i}, var: ${macroVar}`
 *
 * conserve réellement les MacroArgClass à l'intérieur,
 * au lieu de les transformer immédiatement en simple string.
 */
export class MacroTemplate {
  public readonly strings: readonly string[];
  public readonly values: any[];

  constructor(
    strings: readonly string[],
    values: any[],
  ) {
    this.strings = strings;
    this.values = values;
  }

  public getMacroArgs(): MacroArgument[] {
    const macros: MacroArgument[] = [];

    const collect = (value: any) => {
      if (value instanceof MacroArgument) {
        if (!macros.includes(value)) {
          macros.push(value);
        }
        return;
      }

      if (value instanceof MacroTemplate) {
        for (const arg of value.getMacroArgs()) {
          if (!macros.includes(arg)) {
            macros.push(arg);
          }
        }
        return;
      }
    };

    for (const value of this.values) {
      collect(value);
    }

    return macros;
  }

  public toString(): string {
    let result = this.strings[0];

    for (let i = 0; i < this.values.length; i++) {
      result += this.values[i].toString();
      result += this.strings[i + 1];
    }

    return result;
  }
}


export function GuiMacro(strings: TemplateStringsArray, ...values: any[]): MacroTemplate;
export function GuiMacro(value: Score | DataPointClass,): MacroArgument;
export function GuiMacro(stringsOrValue: TemplateStringsArray | Score | DataPointClass, ...values: any[]): MacroTemplate | MacroArgument {
  /*
   * GuiMacro(Variable(...))
   */
  if (stringsOrValue instanceof Score || stringsOrValue instanceof DataPointClass) return new MacroArgument(stringsOrValue);

  /*
   * GuiMacro`...`
   */
  const strings = stringsOrValue;

  const convertedValues = values.map(value => {
    if (value instanceof Score || value instanceof DataPointClass) return new MacroArgument(value);
    return value;
  });

  return new MacroTemplate(
    strings,
    convertedValues,
  );
}