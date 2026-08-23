import { ButtonClass } from "../../button";
import { MacroArgClass, Macroable } from "../../macroArg";
import { Item, MCFunctionType, Text } from "../../types";

export class PaginatedButtonClass extends ButtonClass {
  constructor(
    id: Macroable<Item>,
    count?: Macroable<number>,
    name?: Macroable<Text>,
    lore?: Macroable<Text[]>,
    components?: string[],
    onClick?: MCFunctionType | (() => void),
    macroArgs?: MacroArgClass[]
  ) {
    // On passe un slot par défaut (0) au constructeur parent
    super(id, 0, count, name, lore, components, onClick, macroArgs);
  }

  /**
   * Crée une copie sous forme de `ButtonClass` avec le slot assigné.
   */
  toButton(slot: number): ButtonClass {
    return new ButtonClass(
      this.id,
      slot,
      this.count,
      this.name,
      this.lore,
      [...this.components],
      this.onClick,
      [...this.macroArgs]
    );
  }
}

export function PaginatedButton({
  id,
  count,
  name,
  lore,
  components,
  onClick,
}: {
  id: Macroable<Item>;
  count?: Macroable<number>;
  name?: Macroable<Text>;
  lore?: Macroable<Text[]>;
  components?: string[];
  onClick?: MCFunctionType | (() => void);
}): PaginatedButtonClass {
  return new PaginatedButtonClass(id, count, name, lore, components, onClick);
}
