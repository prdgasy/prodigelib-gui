import { give, MCFunction } from 'sandstone';
import { ButtonClass } from './button';

export type MCFunctionType = ReturnType<typeof MCFunction>;
export type Item = Parameters<typeof give>[1];

export class MacroArgumentClass {
  static id = 0;
  key: string;
  value: any;
  call: () => string;

  constructor(value: any) {
    this.key = `MacroArgument_${(MacroArgumentClass.id++).toString()}`;
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


export type MenuObject = (FillClick | ButtonClass | (() => void));

export type FillClick = {
  /**
   * Set custom instructions inside the fill function
   */
  fill: () => void;
  /**
   * Set custom instructions inside the click function
   */
  click: () => void;
}

