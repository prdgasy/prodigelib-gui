import { give, MCFunction } from 'sandstone';
import { ButtonClass } from './button';
import { Macroable } from './macroArg';

export type MCFunctionType = ReturnType<typeof MCFunction>;
export type Item = Parameters<typeof give>[1];



/**
 * Json text type
 */
export type Text = {
  text: Macroable<string>;
  color?: Macroable<string>;
  italic?: Macroable<boolean>;
  bold?: Macroable<boolean>;
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

