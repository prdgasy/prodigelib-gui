import { give, MCFunction } from 'sandstone';
export type MCFunctionType = ReturnType<typeof MCFunction>;
type Item = Parameters<typeof give>[1];

class MacroArgumentClass {
  static id = 0;
  key: string;
  value: any;
  call: () => string;

  constructor(value: any) {
    this.key = `MacroArguement_${(MacroArgumentClass.id++).toString()}`;
    this.value = value;
    this.call = (): string => { return `$(${this.key})`; };
  }
}

export function MacroArgument(value: any): MacroArgumentClass {
  return new MacroArgumentClass(value);
}

/**
 * Json text type
 */
export type Text = {
  text: string;
  color?: string;
  italic?: boolean;
  bold?: boolean;
};

/**
 * Clickable GUI button
 */
export type Button = {

  id: Item;
  slot: number | string;
  count?: number;

  name?: Text;
  lore?: Text[];
  components?: string[];
  customDataComponentAdded?: boolean;

  onClick?: MCFunctionType | (() => void);

  macroArgs?: MacroArgumentClass[];
};

export type Instruction = {
  /**
   * Set custom instructions inside the fill function
   */
  fill: () => void;
  /**
   * Set custom instructions inside the click function
   */
  click: () => void;
}

/**
 * Represents a GUI page.
 */
export type Page = {
  name: string;
  Buttons?: (Button | Instruction)[];
  id?: number;
  pushed?: boolean;
};