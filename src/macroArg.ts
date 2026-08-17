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

// 🟢 Fonction hybride qui gère l'appel normal ET le Tagged Template
export function MacroArg(stringsOrValue: any, ...values: any[]): MacroArgClass | string {
  // 1. Si appelée comme Tagged Template Literal: $`texte ${valeur}`
  if (Array.isArray(stringsOrValue) && 'raw' in stringsOrValue) {
    const strings = stringsOrValue as unknown as TemplateStringsArray;
    let result = strings[0];

    for (let i = 0; i < values.length; i++) {
      let val = values[i];

      if (val instanceof MacroArgClass) {
        // C'est déjà une macro, on ne fait rien de plus
      } else if (typeof val === 'function' || (val !== null && typeof val === 'object' && !Array.isArray(val))) {
        // C'est un Score ou un Data Point (objet non array), on l'encapsule !
        val = new MacroArgClass(val);
      }

      // La concaténation appelle automatiquement val.toString()
      // Ce qui ajoute la macro aux pendingArgs
      result += String(val) + strings[i + 1];
    }

    return result; // Retourne "Level $(macroArg_0)"
  }

  // 2. Appel classique : $(valeur)
  if (stringsOrValue instanceof MacroArgClass) {
    throw Error(`${stringsOrValue} is already a Macro.`);
  }

  return new MacroArgClass(stringsOrValue);
}