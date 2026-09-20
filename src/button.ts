import { MCFunction } from "sandstone";
import { debugLog } from "./debug";
import type { GUI } from './gui';
import { MacroArgClass, Macroable } from "./macroArg";
import { Item, MCFunctionType, Text } from "./types";

export type ButtonOptions = {
  id: Macroable<Item>,
  slot: Macroable<number>,
  count?: Macroable<number>,
  name?: Text | Macroable<string>,
  lore?: (Text | Macroable<string>)[],
  components?: string[],
  onClick?: MCFunctionType | (() => void),
  macroArgs?: MacroArgClass[]
}

export class ButtonClass {
  static currentButton?: ButtonClass;
  // 🔴 SUPPRIMÉ : static pendingArgs

  id: Macroable<Item>;
  slot: Macroable<number>;
  count: Macroable<number>;
  name: Text | Macroable<string>;
  lore: (Text | Macroable<string>)[];
  components: string[];
  onClick?: MCFunctionType | (() => void);
  macroArgs: MacroArgClass[];
  parent?: GUI;

  constructor(options: ButtonOptions) {
    this.id = options.id;
    this.slot = options.slot;
    this.count = options.count ?? 1;
    this.name = options.name ?? { text: options.id.toString() };
    this.lore = options.lore ?? [];
    this.components = options.components ?? [];
    this.onClick = options.onClick;
    this.macroArgs = options.macroArgs ?? [];

    this.extractMacros();
    this.catchClickArgs();
  }

  private extractMacros() {
    const str = this.toString() + ` slot:${this.slot}`;
    const regex = /\$\((macroArg_\d+)\)/g;
    let match;
    while ((match = regex.exec(str)) !== null) {
      const key = match[1];
      const arg = MacroArgClass.registry.get(key);
      if (arg && !this.macroArgs.includes(arg)) {
        this.macroArgs.push(arg);
      }
    }
  }

  private catchClickArgs() {
    if (typeof this.onClick === 'function') {
      ButtonClass.currentButton = this;
      MCFunction(`_`, () => {
        (this.onClick as () => void)();
      }, { addToSandstoneCore: false });
      ButtonClass.currentButton = undefined;
    }
  }

  inject(arg: MacroArgClass) {
    if (!this.macroArgs.includes(arg)) this.macroArgs.push(arg);
  }

  resolveJSONText(text: Macroable<string> | (Text | Macroable<string>)[] | Text | Text[]): string {
    if (Array.isArray(text)) {
      return text.map(l => this.resolveJSONText(l)).join(',');
    } else if (text instanceof MacroArgClass) {
      return text.toString();
    } else if (typeof text === 'string') {
      return `{text: "${text}", italic: false, color: "white"}`;
    } else {
      return `{text: "${text.text}", color: "${text.color ?? 'white'}", italic: ${text.italic ?? 'false'}, bold: ${text.bold ?? 'false'}}`;
    }
  }

  toString(): string {
    debugLog(`${this.macroArgs.length} macroArg(s) catched:`);
    debugLog(this.macroArgs);
    let lorePart = '';
    let namePart = '';
    if (this.name) lorePart = ', custom_name=' + this.resolveJSONText(this.name);
    if (this.lore) namePart = ', lore=[' + this.resolveJSONText(this.lore) + ']';
    return this.id + '['
      + this.components.toString() + namePart + lorePart
      + '] ' + this.count;
  }
}

export function Button({
  id, slot, count, name, lore, components, onClick, macroArgs
}: ButtonOptions): ButtonClass {
  return new ButtonClass({ id, slot, count, name, lore, components, onClick, macroArgs });
}