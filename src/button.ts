import { MCFunction } from "sandstone";
import { debugLog } from "./debug";
import type { GUI } from './gui';
import { MacroArgClass, Macroable } from "./macroArg";
import { Item, MCFunctionType, Text } from "./types";


type ButtonOptions = {
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
  static pendingArgs: MacroArgClass[] = [];
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


    // Set current button before evaluating properties that might contain macros
    ButtonClass.currentButton = this;

    this.id = options.id;
    this.slot = options.slot;
    this.count = options.count ?? 1;
    this.name = options.name ?? { text: options.id.toString() };
    this.lore = options.lore ?? [];
    this.components = options.components ?? [];
    this.onClick = options.onClick;
    this.macroArgs = options.macroArgs ?? [];

    // pending args injections
    for (const arg of ButtonClass.pendingArgs) {
      this.inject(arg);
    }
    ButtonClass.pendingArgs = [];

    this.catchArgs();

    ButtonClass.currentButton = undefined;

  }

  private catchArgs(currentObject: any = this) {
    if (!currentObject || typeof currentObject !== 'object') return;



    // 1. Si onClick est une fonction, on l'exécute pour intercepter ses appels à toString() / inject()
    if (currentObject === this && typeof this.onClick === 'function') {
      MCFunction(`_`, () => {
        (this.onClick as () => void)();
      }, { addToSandstoneCore: false });
    }

    // 2. Inspection récursive des propriétés
    for (const value of Object.values(currentObject)) {
      if (value instanceof MacroArgClass) {
        if (!this.macroArgs.includes(value)) {
          this.macroArgs.push(value);
        }
      } else if (typeof value === 'object') {
        this.catchArgs(value);
      }
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

  /**
   * Converts the button into a valid Minecraft item string.
   */

  toString(): string {
    debugLog(`${this.macroArgs.length} macroArg(s) catched:`);
    debugLog(this.macroArgs)
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
}: ButtonOptions): ButtonClass {
  // On passe les variables au constructeur
  return new ButtonClass({ id, slot, count, name, lore, components, onClick });
}