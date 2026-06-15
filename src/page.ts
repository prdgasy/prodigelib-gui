import { _, Data, DataPointClass, MCFunction, raw, sandstonePack } from "sandstone";
import { MCFunctionType, MenuObject } from "./types";
import { GUI } from "./gui";
import { ButtonClass } from "./button";

export class PageClass {
  parent: GUI;
  Objects: MenuObject[];

  id: number;
  isPushed = false;
  name: string;
  nameToLower: string;


  static globalId = 0;
  static fillMacroCount = 0;
  static clickMacroCount = 0;

  constructor(parent: GUI, name?: string, Objects?: MenuObject[]) {
    this.parent = parent;
    this.Objects = Objects ?? [];
    this.id = PageClass.globalId++;
    this.name = name ?? `Page_${this.id}`;
    this.nameToLower = this.name.toLowerCase();
  }

  pushObject(...objects: MenuObject[]) {
    if (this.isPushed) throw Error(
      `PRODIGELIB/GUI • Error: Page already pushed. \nTry using pushInstruction() before adding the page (${this.name}) to the menu (${this.parent.name})`);
    this.Objects.push(...objects);
  }

  /**
   * Combination of placeItem and detectClick when different action is not needed
   */
  emitButton(button: ButtonClass) {
    this.placeItem(button);
    this.detectClick(button);
  }

  /**
   * Generates the function that fills the inventory for a page.
   */
  fill(): MCFunctionType {
    return MCFunction(`__gui/${this.parent.name.toLowerCase()}/pages/fill/fill_${this.id}`, () => {
      this.Objects.forEach(e => this.readFillElement(e));
    })
  }

  readFillElement(e: MenuObject) {
    if (GUI.isButton(e)) {
      this.placeItem(e);
    } else if (typeof e === 'function') {
      e();
    } else {
      e.fill();
    }
  }



  /**
   * Emit the button to a function
   * @param button Button emited
   */
  placeItem(button: ButtonClass) {
    // add custom_data if not already

    if (button.macroArgs && button.macroArgs.length !== 0) {
      const macroFunction = MCFunction(`__gui/${this.parent.name.toLowerCase()}/pages/fill/macros/macro_${PageClass.fillMacroCount++}`, () => {
        raw(`$item replace entity @s container.${button.slot} with ${button.toString()}`);
      });

      this.setMacroArgs(button);
      raw(`function ${macroFunction.toString()} with storage ${this.parent.macroStorage.currentTarget} ${this.parent.macroStorage.path}`);

    } else {
      raw(`item replace entity @s container.${button.slot} with ${button.toString()}`);
    }
  }

  /**
   * Sets macro arguments inside storage.
   */
  setMacroArgs(button: ButtonClass) {
    if (button.macroArgs) {
      button.macroArgs.forEach(argument => {
        this.parent.macroStorage
          .select(argument.key)
          .set(argument.value)

      })

    }

  }

  /**
   * Generates the click detection function for a page.
   */
  click(): MCFunctionType {
    return MCFunction(`__gui/${this.parent.name.toLowerCase()}/pages/click/click_${this.id}`, () => {
      this.Objects.forEach(e => this.readClickElement(e));
    })
  }

  readClickElement(e: MenuObject) {
    if (GUI.isButton(e)) {
      this.detectClick(e);
    } else if (typeof e === 'function') {
      e();
    } else {
      e.click()
    }
  }

  /**
   * Detect the click of the player on a slot and run the associated function button.onClick()
   * @param button Button clicked on
   */
  detectClick(button: ButtonClass) {
    if (button.macroArgs && button.macroArgs.length !== 0) {
      const macroCounter = PageClass.clickMacroCount++;
      const onClickFunction = MCFunction(`__gui/${this.parent.name.toLowerCase()}/pages/click/macro_onclick/${macroCounter}`, () => {
        if (button.onClick) button.onClick();
      });

      const detectMissingItem = MCFunction(`__gui/${this.parent.name.toLowerCase()}/pages/click/macros/${macroCounter}`, () => {
        if (button.onClick) {
          // Use normal text if no special slot macro args
          let macroTag = '';
          if (typeof (button.slot) == 'string') macroTag = '$';
          raw(`${macroTag}execute unless data entity @s Items[{Slot:${button.slot}b}] run function ${onClickFunction.toString()} with storage ${this.parent.macroStorage.currentTarget} ${this.parent.macroStorage.path}`);
        }
      });

      this.setMacroArgs(button);
      raw(`function ${detectMissingItem.toString()} with storage ${this.parent.macroStorage.currentTarget} ${this.parent.macroStorage.path}`);

    } else {
      // No macro
      if (button.onClick) {
        _.if(_.not(_.data(Data('entity', '@s', `Items[{Slot:${button.slot}b}]`))), () => {
          if (button.onClick) button.onClick();
        })
      }
    }
  }

  /**
   * Adds a page to the GUI.
   */
  public build() {
    if (this.parent.Pages.includes(this)) throw Error(`The page ${this.name} already exists`);

    this.parent.Pages.push(this);
    this.parent.pageNameIndex.set(this.name, this.id);

    this.fill();
    this.click();

    this.isPushed = true;
  }
}

export function Page(parent: GUI, name?: string, Objects?: MenuObject[]): PageClass {
  return new PageClass(parent, name, Objects);
}