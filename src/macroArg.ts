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

  toString(): string {
    if (ButtonClass.currentButton) {
      // Cas A : On est DANS l'évaluation du bouton (ex: exécution du onClick)
      ButtonClass.currentButton.inject(this);
    } else {
      // Cas B : On est AVANT le constructeur (ex: concaténation string dans "name" ou "lore")
      // On le met en attente, le bouton va l'aspirer dans 1 milliseconde
      ButtonClass.pendingArgs.push(this);
    }

    return `$(${this.key})`;
  }
}

export function Macro(value: any): MacroArgClass {
  return new MacroArgClass(value);
}