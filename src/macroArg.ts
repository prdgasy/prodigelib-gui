import { ButtonClass } from "./button";

export type Macroable<T> = T | MacroArgClass;

export class MacroArgClass {
  static id = 0;
  key: string;
  value: any;

  constructor(value: any) {
    this.key = `macroArg_${(MacroArgClass.id++).toString()}`;
    this.value = value;
  }

  // private resolveValue<T>(field: Macroable<T>): string {
  //   if (field instanceof MacroArg) {
  //     // 🟢 L'enregistrement automatique se fait ICI !
  //     // Si ce bouton est en cours de traitement, la macro s'ajoute à ses dépendances.
  //     if (!this.macroArgs.includes(field)) {
  //       this.macroArgs.push(field);
  //     }
  //     return field.get(); // Renvoie "$(...)"
  //   }
  //   return String(field); // Renvoie l'item ou le slot brut
  // }

  toString() {
    ButtonClass.currentButton.inject(this);
    return `$(${this.key})`;
  }
}

export function macroArg(value: any): MacroArgClass {
  return new MacroArgClass(value);
}