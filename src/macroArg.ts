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


// 1. Type utilitaire magique :
// Si V est une fonction qui renvoie R :
//    - Si R est void ou undefined -> 'never' (DECLENCHE L'ERREUR EN ROUGE)
//    - Si R est une vraie valeur  -> V (Valide la fonction)
// Si V n'est pas une fonction     -> 'never' (REJETTE "a", 123, playerKills, etc.)
type MacroErrorMustReturn = "[Prodigelib GUI] Your $() callback MUST be inside a function AND return a value.";
export type ValidMacroCallback<V> = V extends (arg: any) => infer R
  ? ([R] extends [void] ? MacroErrorMustReturn
    : ([R] extends [undefined] ? MacroErrorMustReturn : V))
  : MacroErrorMustReturn;

export function MacroArg<V>(
  value: ValidMacroCallback<V>
): MacroArgClass {
  if (value instanceof MacroArgClass) {
    throw Error(`${value} is already a Macro.`);
  }

  if (typeof value === 'function') {
    return new MacroArgClass(value);
  }



  throw new Error(
    `[Prodigelib GUI] Sandstone objects and raw values must be wrapped in a function inside $().\n` +
    `  - Correct:   $(() => playerKills) or $(() => "a")\n` +
    `  - Incorrect: $(playerKills) or $("a")`
  );
}