import { Item, MCFunctionType, Text } from "./types";
import { GUI } from './gui';
import { PageClass } from "./page";
import { MacroArgClass, Macroable } from "./macroArg";
import { MCFunction } from "sandstone";


export class ButtonClass {
  static currentButton: ButtonClass;
  id: Macroable<Item>;
  slot: Macroable<number>;
  count: Macroable<number>;

  name: Macroable<Text>;
  lore: Macroable<Text[]>;
  components: string[];

  onClick?: MCFunctionType | (() => void);

  macroArgs: MacroArgClass[];

  parentTagged = false;

  parent?: GUI;

  constructor(id: Macroable<Item>, slot: Macroable<number>, count?: Macroable<number>, name?: Macroable<Text>, lore?: Macroable<Text[]>, components?: string[], onClick?: MCFunctionType | (() => void), macroArgs?: MacroArgClass[]) {
    this.id = id;
    this.slot = slot;
    this.count = count ?? 1;
    this.name = name ?? { text: id.toString() };
    this.lore = lore ?? [];
    this.components = components ?? [];
    this.onClick = onClick;
    this.macroArgs = macroArgs ?? [];

    ButtonClass.currentButton = this;
    this.catchArgs();
  }

  private catchArgs(currentObject: any = this) {
    // 1. Sécurité : si ce n'est pas un objet ou un tableau, ou si c'est nul, on s'arrête
    if (!currentObject || typeof currentObject !== 'object') return;

    // 2. On récupère toutes les valeurs de l'objet ou du sous-objet actuel
    for (const value of Object.values(currentObject)) {

      // Si on tombe sur une instance de Macro, bingo !
      if (value instanceof MacroArgClass) {
        if (!this.macroArgs.includes(value)) {
          this.macroArgs.push(value);
        }
      }
      // 🟢 Si c'est un sous-objet ou un tableau (comme "name" ou "lore"), on fouille dedans !
      else if (typeof value === 'object') {
        this.catchArgs(value); // Appel récursif pour inspecter l'intérieur
      }
    }
  }

  inject(arg: MacroArgClass) {
    if (!this.macroArgs.includes(arg)) this.macroArgs.push(arg);
  }

  resolveJSONText(text: Macroable<Text | Text[]>): string {
    if (Array.isArray(text)) {
      return text.map(l => this.resolveJSONText(l)).join(',');
    } else if (text instanceof MacroArgClass) {
      return text.toString();
    } else {
      return `{text: "${text.text}", color: "${text.color ? text.color : 'white'}", italic: ${text.italic ? text.italic : 'false'}, bold: ${text.bold ? text.bold : 'false'}}`;
    }
  }

  /**
   * Converts the button into a valid Minecraft item string.
   */
  toString(): string {
    let lorePart = '';
    let namePart = '';
    if (this.name) lorePart = ', custom_name=' + this.resolveJSONText(this.name);
    if (this.lore) namePart = ', lore=[' + this.resolveJSONText(this.lore) + ']';
    return this.id + '['
      + this.components.toString() + namePart + lorePart
      + ']'
  }
}

// On accepte UN SEUL objet qui contient toutes les propriétés
export function Button({
  id,
  slot,
  count,
  name,
  lore,
  components,
  onClick
}: {
  id: Macroable<Item>;
  slot: Macroable<number>;
  count?: Macroable<number>;
  name?: Macroable<Text>;
  lore?: Macroable<Text[]>;
  components?: string[];
  onClick?: MCFunctionType | (() => void);
}): ButtonClass {
  // On passe les variables au constructeur
  return new ButtonClass(id, slot, count, name, lore, components, onClick);
}