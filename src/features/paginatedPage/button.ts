import { ButtonClass, ButtonOptions } from "../../button";
import { MacroArgClass, Macroable } from "../../macroArg";
import { Item, MCFunctionType, Text } from "../../types";

export class PaginatedButtonClass extends ButtonClass {
  constructor(
    id: Macroable<Item>,
    slot: number,
    count?: Macroable<number>,
    name?: Text | Macroable<string>,
    lore?: (Text | Macroable<string>)[],
    components?: string[],
    onClick?: MCFunctionType | (() => void),
    macroArgs?: MacroArgClass[]
  ) {
    // On passe un slot par défaut (0) au constructeur parent
    super({ id, slot, count, name, lore, components, onClick, macroArgs });
  }

  /**
   * Crée une copie sous forme de `ButtonClass` avec le slot assigné.
   */
  toButton(slot: number): ButtonClass {
    return new ButtonClass({
      id: this.id,
      slot,
      count: this.count,
      name: this.name,
      lore: this.lore,
      components: [...this.components],
      onClick: this.onClick,
      macroArgs: [...this.macroArgs]
    });
  }
}

export function PaginatedButton({
  id,
  count,
  name,
  lore,
  components,
  onClick,
}: Omit<ButtonOptions, 'slot'>): PaginatedButtonClass {
  return new PaginatedButtonClass(id, 0, count, name, lore, components, onClick);
}
