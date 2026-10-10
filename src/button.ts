import { MCFunction } from "sandstone";
import type { Gui } from './gui';
import { MacroArgument, Macroable } from "./macroArg";
import { Item, MCFunctionType, Text } from "./types";



export class Button {
  public id: Macroable<Item>;
  public slot?: Macroable<number>;
  public count: Macroable<number>;

  public name: Macroable<string>;
  public lore: Macroable<string>[];
  public components: string[];


  public onClick?: MCFunctionType | (() => void);

  private macros: MacroArgument[];

  public parentGui!: Gui;

  constructor(
    id: Macroable<Item>,
    slot?: Macroable<number>,
    name?: Macroable<string>,
    onClick?: MCFunctionType | (() => void),
    lore?: Macroable<string>[],
    count?: Macroable<number>,
    components?: string[],
  ) {

    this.id = id;
    this.slot = slot;
    this.count = count ?? 1;
    this.name = name ?? id;
    this.lore = lore ?? [];
    this.components = components ?? [];
    this.onClick = onClick;

    this.macros = this.catchArgs(this);
  }

  private catchArgs(obj: any) {
    const macros: MacroArgument[] = [];

    if (!obj) return [];

    if (obj instanceof MacroArgument) return [obj];

    for (const value of Object.values(obj)) {
      if (typeof value === 'object') macros.push(...this.catchArgs(value));
    }

    return macros;
  }

  public inject(arg: MacroArgument) {
    if (!this.macros.includes(arg)) this.macros.push(arg);
  }

  public resolveJSONText(text: Macroable<string> | Macroable<string>[]): string {
    if (Array.isArray(text)) return text.map(l => this.resolveJSONText(l)).join(',');

    if (text instanceof MacroArgument) return text.toString();

    return `{text: "${text}", italic: false, color: "white"}`;
  }

  public getMacroArgs(): MacroArgument[] {
    return this.macros;
  }

  public hasMacro(): boolean {
    return this.macros.length > 0;
  }

  public getparentGui(): Gui {
    return this.parentGui;
  }

  public toString(): string {

    let lorePart = '';
    let namePart = '';
    if (this.name) lorePart = ', custom_name=' + this.resolveJSONText(this.name);
    if (this.lore) namePart = ', lore=[' + this.resolveJSONText(this.lore) + ']';
    return this.id + '['
      + this.components.toString() + namePart + lorePart
      + '] ' + this.count;
  }
}