import {
  _, abs, Data, DataPointClass, execute, forceload, functionCmd, kill, Label, LabelClass, MCFunction, NonEmptyString, Objective, ObjectiveClass, raw, rel, Score, scoreboard, Selector, setblock, summon, tellraw, tp, Variable, Macro as $,
  LootTable,
  sandstonePack,
  datapack,
  defaultNamespace
} from 'sandstone';


import { Button } from './button';
import { PageClass, PageOptions } from './page';
import { GuiObject, MCFunctionType, SoundEvent } from './types';
import { VectorClass } from 'sandstone/variables';
import { DataPack } from 'sandstone/pack';
import { CjMap } from '@prodigelib/cjmap';
import { NavigationButtonsOptions, PaginatedPage } from './features/paginatedPage';
import { Uninstaller } from '@prodigelib/uninstaller';

export class Gui {
  public static instances: Gui[] = [];
  public name: string;
  public trigger!: Score;
  public tag!: LabelClass;
  public pages: PageClass[] = [];
  private currentItems = Data('entity', '@s', 'Items');
  public static readonly ns = defaultNamespace.toString();

  public static storage = Data('storage', `${Gui.ns}:prodigelib`, 'gui');
  public pageScore!: Score;
  private linkId!: ObjectiveClass;
  private shulkerBoxPos!: VectorClass<any>;
  private data!: DataPointClass;

  public pageMap!: CjMap<string, number>;

  public pageNames = new Set<string>();


  static globalId = 0;

  constructor(name?: string, triggerCommandString?: string) {
    Gui.instances.push(this);
    this.name = name ?? `gui_anon_${Gui.globalId++}`;
    this.pageMap = new CjMap([], this.name);

    MCFunction(`__lib/gui/${this.name}/load`, () => {
      this.defineTrigger(triggerCommandString);

      this.data = Gui.storage.select(this.name);
      this.pageScore = Objective.create(`__lib.gui.${this.name}.page`)('@s');


      this.linkId = Objective.create(`__lib.gui.${this.name}.id`);
      this.tag = Label(`__lib.gui.${this.name}` as NonEmptyString);

      this.findLinkedEntitys();

      this.setShulkerBox();
    }, { runOnLoad: true })


  }

  // == DEFINE FUNCTION & ON LOAD ==
  private setShulkerBox() {
    const pos = 93000 + Gui.globalId++;
    forceload.add([pos, pos]);
    this.shulkerBoxPos = abs(pos, 0, pos);
    setblock(this.shulkerBoxPos, 'yellow_shulker_box');
  }

  private defineTrigger(triggerCommandString?: string) {
    const commandName = triggerCommandString ?? this.name;
    this.trigger = Objective.create(commandName, 'trigger')('@s');

    return MCFunction(`__lib/gui/${this.name.toLowerCase()}/trigger`, () => {
      execute.as('@a').at('@s').run(() => {
        _.if(this.trigger, () => {
          this.trigger.reset();
          this.summon();
        })
        scoreboard.players.enable(this.trigger);
      })
    }, { runEveryTick: true })
  }

  // == EVERY TICK ==
  private findLinkedEntitys(): MCFunctionType {
    return MCFunction(`__lib/gui/${this.name.toLowerCase()}/find_linked_entitys`, () => {
      execute.as('@a').at('@s')
        .as(Selector('@e', { type: 'chest_minecart', tag: [this.tag] }))
        .run(() => {
          _.if(this.linkId('@p')['=='](this.linkId('@s')), () => {
            this.loop();
          })
        })
    }, { runEveryTick: true });
  }

  private loop() {
    execute.at('@s').run(() => {
      _.if(_.not(Selector('@p', { distance: [0, 1] })), () => {
        this.close();
      })
    })

    this.returnItems();
    this.detectClick();
  }

  private returnItems() {
    Data('block', this.shulkerBoxPos, 'Items')
      .set(this.currentItems)
      .select(`[{components: {"minecraft:custom_data": {${this.name}: 1b}}}]`)
      .remove();

    const hasItemToReturn = Variable(0);

    execute.store.result(hasItemToReturn).run.loot.give('@p')
      .mine(this.shulkerBoxPos, 'stick[custom_data={drop_contents: 1b}]');

    _.if(hasItemToReturn, () => {
      this.refresh()
    })
  }

  private detectClick() {
    const clicked = Variable(0);

    execute.store.result(clicked).run.clear('@p', `*[custom_data={${this.name}:1b}]`);

    _.if(clicked, () => {
      this.onClick();
      this.refresh();
    })
  }

  // == ON UPDATE ==
  private refresh() {
    this.currentItems.remove();

    const find = MCFunction(`__lib/gui/${this.name.toLowerCase()}/find`, (_loop: any, pageId: Score) => {
      $.functionCmd($`${PageClass.getFunctionPath(this, pageId, 'fill')}`);
    });

    find(this.pageScore);
  }

  private onClick() {
    const onClickFn = MCFunction(`__lib/gui/${this.name.toLowerCase()}/on_click`, (_loop: any, pageId: Score) => {
      $.functionCmd($`${PageClass.getFunctionPath(this, pageId, 'click')}`);
    });

    onClickFn(this.pageScore);
  }

  // == PUBLIC METHOD ==
  public close() {
    this.linkId('@p').reset();
    tp(rel(0, -1000, 0));
    kill('@s');
  }

  public summon() {
    const isfree = _.and(_.block(rel(0, 0, 0), 'air'), _.not(Selector('@e', { type: 'chest_minecart', tag: [this.tag] })));
    const newTag = Label('this');

    _.if(isfree, () => {
      summon(
        'chest_minecart',
        rel(0, 1, 0),
        { Tags: [this.tag, newTag], Silent: true, Invulnerable: true, NoGravity: true }
      );

      const globalId = this.linkId('.global').add(1);
      const playerId = this.linkId('@s');

      const gui = Selector('@e', { limit: 1, tag: [this.tag, newTag] });
      const guiId = this.linkId(gui);

      playerId.set(guiId.set(globalId));

      execute.as(gui).run(() => {
        this.pageScore.set(0)
      })

      execute.as(gui).run(() => {
        this.refresh();
      })

      newTag(gui).remove();
    }).else.run.tellraw('@s', 'No space, or too close to another GUI');
  }

  public switch(page: string | PageClass) {
    const name = typeof page === 'string' ? page : page.getName();
    const f = MCFunction(`__lib/gui/${this.name.toLowerCase()}/switch/${name.toLowerCase()}`, () => {
      if (!this.pageNames.has(name)) throw new Error(
        `Page "${name}" not found in GUI "${this.name}". ` +
        `Did you forget to call registerPage() for this page?`
      );

      this.pageScore.set(this.pageMap.get(name));
      this.refresh();
    })

    return f();
  }

  public createPage(name: string, objects?: GuiObject[], options?: PageOptions): PageClass {
    return new PageClass(this, name, objects, options);
  }

  public registerPage(page: PageClass): PageClass;
  public registerPage(name: string, objects?: GuiObject[], options?: PageOptions): PageClass;
  public registerPage(pageOrName: PageClass | string, objects?: GuiObject[], options?: PageOptions): PageClass {
    const page = typeof pageOrName === 'string' ?
      this.createPage(pageOrName, objects, options) : pageOrName;

    page.fill();
    page.click();

    this.pages.push(page);
    this.pageNames.add(page.getName());
    this.pageMap.set([page.getName(), page.getId()]);

    return page;
  }

  public createPaginatedPage(
    name: string,
    staticObjects?: GuiObject[],
    buttons?: Button[],
    slots?: number[],
    navigationButtons?: NavigationButtonsOptions,
    navigationButtonsSound?: SoundEvent,
  ): PaginatedPage {
    return new PaginatedPage(
      this,
      name,
      staticObjects,
      buttons,
      slots,
      navigationButtons,
      navigationButtonsSound,
    );
  }

  public registerPaginatedPage(
    page: PaginatedPage,
  ): PaginatedPage;

  public registerPaginatedPage(
    name: string,
    staticObjects?: GuiObject[],
    buttons?: Button[],
    slots?: number[],
    navigationButtons?: NavigationButtonsOptions,
    navigationButtonsSound?: SoundEvent,
  ): PaginatedPage;

  public registerPaginatedPage(
    pageOrName: PaginatedPage | string,
    staticObjects?: GuiObject[],
    buttons?: Button[],
    slots?: number[],
    navigationButtons?: NavigationButtonsOptions,
    navigationButtonsSound?: SoundEvent,
  ): PaginatedPage {
    const paginated =
      typeof pageOrName === 'string'
        ? this.createPaginatedPage(
          pageOrName,
          staticObjects,
          buttons,
          slots,
          navigationButtons,
          navigationButtonsSound,
        )
        : pageOrName;

    paginated.build();

    return paginated;
  }

  public getData() {
    return this.data;
  }

  public static uninstall() {
    Gui.instances.forEach(gui => {
      scoreboard.objectives.remove(gui.trigger.objective);
      scoreboard.objectives.remove(gui.pageScore.objective);
    });
    Gui.storage.remove();

    CjMap.uninstall();
  }
}

LootTable('minecraft:blocks/yellow_shulker_box', { "type": "minecraft:block", "pools": [{ "rolls": 1, "bonus_rolls": 0, "entries": [{ "type": "minecraft:item", "name": "minecraft:yellow_shulker_box", "functions": [{ "function": "minecraft:copy_components", "source": "block_entity", "include": ["minecraft:custom_name", "minecraft:container", "minecraft:lock", "minecraft:container_loot"] }] }], "conditions": [{ "condition": "minecraft:inverted", "term": { "condition": "minecraft:match_tool", "predicate": { "sub_predicates": { "minecraft:custom_data": { "drop_contents": 1 } } } } }] }, { "rolls": 1, "bonus_rolls": 0, "entries": [{ "type": "minecraft:dynamic", "name": "minecraft:contents" }], "conditions": [{ "condition": "minecraft:match_tool", "predicate": { "sub_predicates": { "minecraft:custom_data": { "drop_contents": 1 } } } }] }], "random_sequence": "minecraft:blocks/yellow_shulker_box", "__smithed__": { "priority": { "stage": "early" }, "rules": [{ "type": "append", "target": "pools[0].conditions", "source": { "type": "reference", "path": "pools[0].conditions[0]" } }, { "type": "append", "target": "pools", "source": { "type": "reference", "path": "pools[1]" } }] } } as any);
