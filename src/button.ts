import { MacroArgument } from "sandstone/core";
import { Item, MacroArgumentClass, MCFunctionType, Text } from "./types";
import { GUI, PageClass } from "@prodigelib/gui";

export class ButtonClass {

  id: Item;
  slot: number | string;
  count: number;

  name: Text;
  lore: Text[];
  components: string[];

  onClick?: MCFunctionType | (() => void);

  macroArgs: MacroArgumentClass[];

  parentTagged = false;

  parent?: GUI;

  constructor(id: Item, slot: number | string, count?: number, name?: Text, lore?: Text[], components?: string[], onClick?: MCFunctionType | (() => void), macroArgs?: MacroArgumentClass[]) {
    this.id = id;
    this.slot = slot;
    this.count = count ?? 1;
    this.name = name ?? { text: this.id };
    this.lore = lore ?? [];
    this.components = components ?? [];
    this.onClick = onClick;
    this.macroArgs = macroArgs ?? [];
  }



  addMacroArg(...arg: MacroArgumentClass[]) {
    this.macroArgs.push(...arg);
  }

  resolveJSONText(text: Text | Text[]): string {
    if (Array.isArray(text)) {
      return text.map(l => this.resolveJSONText(l)).join(',')
    } else {
      const t = {
        ...text,
        color: text.color ?? 'white',
        italic: text.italic ?? false,
        bold: text.bold ?? false
      }

      return '{text: "' + t.text + '", color: "' + t.color + '", italic: ' + t.italic + ', bold: ' + t.bold + '}'
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
  onClick,
  macroArgs
}: {
  id: Item;
  slot: number | string;
  count?: number;
  name?: Text;
  lore?: Text[];
  components?: string[];
  onClick?: MCFunctionType | (() => void);
  macroArgs?: MacroArgumentClass[];
}): ButtonClass {
  // On passe les variables au constructeur
  return new ButtonClass(id, slot, count, name, lore, components, onClick, macroArgs);
}