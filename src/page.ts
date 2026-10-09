import { _, Data, DataPointClass, execute, functionCmd, MCFunction, raw, Score, Macro as $, defaultNamespace, comment, Variable } from "sandstone";
import { Button } from "./button";
import { Gui } from "./gui";
import { MacroArgument, MacroTemplate } from "./macroArg";
import { MCFunctionType, GuiObject } from "./types";
import { MacroLiteral } from "sandstone/core";

export type PageOptions = {
  paginated?: boolean,
  main?: boolean,
}

export class PageClass {
  private parentGui: Gui;
  private name: string;
  public objects: GuiObject[];
  private options: PageOptions;

  private context: 'fill' | 'click' | undefined;

  private id;
  static id = 0;

  constructor(parentGui: Gui, name?: string, objects?: GuiObject[], options?: PageOptions) {
    this.parentGui = parentGui;
    this.name = name ?? `page_anon_${PageClass.id}`;
    this.objects = objects ?? [];
    this.options = options ?? {};

    this.id = PageClass.id;

    PageClass.id++;
  }

  public getId() {
    return this.id;
  }

  public static getFunctionPath(parentGui: Gui, page: | number, context: 'fill' | 'click'): string;
  public static getFunctionPath(parentGui: Gui, page: Score, context: 'fill' | 'click'): MacroLiteral;
  public static getFunctionPath(parentGui: Gui, page: number | Score, context: 'fill' | 'click') {
    const guiName = parentGui.name.toLowerCase();

    if (typeof page === 'number') {
      return `__lib/gui/${guiName}/pages/${page}/${context}`;
    }
    return $`${Gui.ns}:__lib/gui/${guiName}/pages/${page}/${context}`;
  }

  private linkParent(btn: Button) {
    if (!btn.getparentGui()) {
      btn.parentGui = this.parentGui;
      btn.components.push(`custom_data={${this.parentGui.name}: 1b}`);
    }
  }

  private registeredMacroArgs(button: Button) {
    const pairsData = this.parentGui.getData().select(this.name);
    const keys: DataPointClass[] = [];

    button.getMacroArgs().forEach(a => {
      const x = pairsData.select(a.key);
      keys.push(x);
      x.set(a.getValue())
    })

    return keys;
  }

  public emit(btn: Button) {
    this.linkParent(btn)
    if (this.context == 'fill') {
      return this.placeItem(btn);
    } else if (this.context == 'click') {
      return this.detectClick(btn);
    }
  }



  // FILL ITEMS
  fill(): MCFunctionType {
    return MCFunction(PageClass.getFunctionPath(this.parentGui, this.id, 'fill'), () => {
      this.context = 'fill';
      this.objects.forEach(e => this.readFillElement(e));
      this.context = undefined;
    })
  }

  private readFillElement(obj: GuiObject) {
    if (obj instanceof Button) return this.placeItem(obj);
    if (typeof obj == 'function') return obj();
    if ('fill' in obj) return obj.fill!();
  }

  public placeItem(btn: Button) {
    if (btn.slot === undefined) throw new Error(
      `Missing slot parameter for button "${String(btn.name)}" ` +
      `in page "${this.name}" of GUI "${this.parentGui.name}". ` +
      `A slot must be provided before the button can be placed.`
    );


    comment(`${this.parentGui.name}::${this.name}::fill -> ${btn.name}(${btn.slot})`);
    if (!btn.hasMacro()) {
      return raw(`item replace entity @s container.${btn.slot} with ${btn.toString()}`);
    }

    return _.with(this.registeredMacroArgs(btn), () => {
      comment(`${this.parentGui.name}::${this.name}::fill::macro -> ${btn.name}(${btn.slot})`);
      raw(`$item replace entity @s container.${btn.slot} with ${btn.toString()}`);
    })
  }


  // CLICK DETECTION
  public click() {
    return MCFunction(PageClass.getFunctionPath(this.parentGui, this.id, 'click'), () => {
      this.context = 'click';
      this.objects.forEach(e => this.readClickElement(e));
      this.context = undefined;
    })
  }

  private readClickElement(obj: GuiObject) {
    if (obj instanceof Button && obj.onClick != null) return this.detectClick(obj);
    if (typeof obj === 'function') return obj();
    if ('click' in obj) return obj.click!();
  }

  public detectClick(btn: Button) {
    comment(`${this.parentGui.name}::${this.name}::click -> ${btn.name}(${btn.slot})`);

    if (btn.hasMacro()) return _.with(this.registeredMacroArgs(btn), () => {
      comment(`${this.parentGui.name}::${this.name}::click::macro -> ${btn.name}(${btn.slot})`);
      $.execute.unless.data.entity('@s', `Items[{Slot:${btn.slot}b}]`).run(() => { btn.onClick() });
    });

    return _.if(_.not(_.data(Data('entity', '@s', `Items[{Slot:${btn.slot}b}]`))), () => btn.onClick());

  }

  public getName(): string {
    return this.name;
  }

  public getObjects(): GuiObject[] {
    return this.objects;
  }

  public getOptions(): PageOptions {
    return this.options;
  }

  public add(...obj: GuiObject[]): number {
    return this.objects.push(...obj);
  }
}