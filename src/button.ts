import { MCFunction } from "sandstone";
import { debugLog } from "./debug";
import { GUI } from './gui';
import { MacroArgClass, Macroable } from "./macroArg";
import { Item, MCFunctionType, Text } from "./types";


export class ButtonClass {
  static currentButton: ButtonClass;
  static pendingArgs: MacroArgClass[] = [];
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


    // Set current button before evaluating properties that might contain macros
    ButtonClass.currentButton = this;

    this.id = id;
    this.slot = slot;
    this.count = count ?? 1;
    this.name = name ?? { text: id.toString() };
    this.lore = lore ?? [];
    this.components = components ?? [];
    this.onClick = onClick;
    this.macroArgs = macroArgs ?? [];

    // pending args injections
    for (const arg of ButtonClass.pendingArgs) {
      this.inject(arg);
    }
    ButtonClass.pendingArgs = [];

    this.catchArgs();

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