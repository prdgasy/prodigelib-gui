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

  currentContext: 'fill' | 'click' | null = null;

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

  linkParent(button: ButtonClass) {
    if (!button.parent) {
      button.parent = this.parent;
      button.components.push(`custom_data={${this.parent.name}: 1b}`);
    }
  }

  pushObject(...objects: MenuObject[]) {
    if (this.isPushed) throw Error(
      `PRODIGELIB/GUI • Error: Page already pushed. \nTry using pushInstruction() before adding the page (${this.name}) to the menu (${this.parent.name})`);

    this.Objects.push(...objects);
  }

  /**
   * Combination of placeItem and detectClick when different action is not needed.
   * Auto-detects the compilation context to avoid mixing files.
   */
  emitButton(button: ButtonClass) {
    // 🟢 Si on est en train d'exécuter la boucle de "fill", on ne pose QUE l'item
    if (this.currentContext === 'fill') {
      this.placeItem(button);
    }
    // 🟢 Si on est en train d'exécuter la boucle de "click", on ne met QUE la détection
    else if (this.currentContext === 'click') {
      this.detectClick(button);
    }
    // 🟢 Sécurité si appelé en dehors des boucles principales de Sandstone
    else {
      console.error("No context");
    }
  }

  /**
   * Generates the function that fills the inventory for a page.
   */
  fill(): MCFunctionType {
    return MCFunction(`__gui/${this.parent.name.toLowerCase()}/pages/fill/${this.id}`, () => {
      this.currentContext = 'fill';
      this.Objects.forEach(e => this.readFillElement(e));
      this.currentContext = null;
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
    this.linkParent(button);
    if (button.macroArgs && button.macroArgs.length !== 0) {
      const macroFunction = MCFunction(`__gui/${this.parent.name.toLowerCase()}/pages/fill/macros/${PageClass.fillMacroCount++}`, () => {
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
    return MCFunction(`__gui/${this.parent.name.toLowerCase()}/pages/click/${this.id}`, () => {
      this.currentContext = 'click';
      this.Objects.forEach(e => this.readClickElement(e));
      this.currentContext = null;
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
    this.linkParent(button);
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