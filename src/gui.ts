import {
  _, Data, execute, Label, MCFunction, Objective, rel, Score, scoreboard,
  Selector, summon, tellraw, functionCmd, raw, kill, tp, abs,
  forceload, loot, Variable, clear, LootTable, give,
  MCFunctionClass,
  say,
  sandstonePack
} from 'sandstone'

import { DataPointClass, LabelClass, ObjectiveClass } from 'sandstone/variables'

export type MCFunctionType = ReturnType<typeof MCFunction>;
type ITEMS = Parameters<typeof give>[1];

/**
 * Main GUI controller.
 * Handles page management, click detection and entity linking.
 */
export namespace GUI {
  export type MacroArgument = Record<string, any>;

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

    id: ITEMS;
    slot: number | string;
    count?: number;

    name?: Text;
    lore?: Text[];
    components?: string[];
    customDataComponentAdded?: boolean;

    onClick?: MCFunctionType | (() => void);

    macroArgs?: MacroArgument[];
  };

  type Instruction = {
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

  export class Init {

    name: string
    triggerCmd: string

    Pages: Page[] = []
    pageId = 0;
    fillMacroCounter: number = 0;
    clickMacroCounter: number = 0;

    macroStorage: DataPointClass<'storage'>
    pageIdScore: Score;

    Ids: ObjectiveClass
    GUILabel: LabelClass

    refresh: MCFunctionType
    clickFinder: MCFunctionType


    constructor(name: string, triggerCmd: string, pages?: Page[]) {

      this.name = name
      this.triggerCmd = triggerCmd

      this.pageIdScore = Objective.create(`${name}.page`)('@s')

      this.macroStorage = Data('storage', `${sandstonePack.defaultNamespace}:${this.name}`, '__gui.macroKeys');

      this.Ids = Objective.create(`${name}.gui.id`)
      this.GUILabel = Label(`${name}.gui`)

      if (pages) {
        this.initPages(pages)
      }

      this.defineTrigger()
      this.findObjs()

      this.refresh = this.defineRefresh()
      this.clickFinder = this.defineClickFinder()

      forceload.add([930005, 930005])
    }

    static resolveJSONText(text: Text | Text[]): string {
      if (Array.isArray(text)) {
        return text.map(l => Init.resolveJSONText(l)).join(',')
      } else {
        const t = {
          ...text,
          color: text.color ?? 'white',
          italic: text.italic ?? false,
          bold: text.bold ?? false
        }

        return '{text: "' + t.text + '", color: "' + t.color + '", italic: ' + t.italic + ', bold: ' + t.bold + '}'
      }
    }

    /**
     * Converts the button into a valid Minecraft item string.
     */
    static buttonToString(button: Button & Required<Pick<Button, 'components'>>): string {
      let lorePart = '';
      let namePart = '';
      if (button.name) lorePart = ', custom_name=' + Init.resolveJSONText(button.name);
      if (button.lore) namePart = ', lore=[' + Init.resolveJSONText(button.lore) + ']';
      return button.id + '['
        + button.components.toString() + namePart + lorePart
        + ']'
    }
    /* -------------------------------------------------------------------------- */
    /*                             ENTITY MANAGEMENT                              */
    /* -------------------------------------------------------------------------- */

    /**
     * Links players and GUI entities that share the same ID.
     */
    findObjs(): MCFunctionType {

      return MCFunction(`__gui/${this.name}/findobjs`, () => {

        execute
          .as('@a')
          .at('@s')
          .as(Selector('@e', { type: 'chest_minecart', tag: [this.GUILabel] }))
          .run(() => {

            _.if(this.Ids('@p')['=='](this.Ids('@s')), () => {
              this.main()
            })

          })

      }, { runEveryTick: true })
    }


    /**
     * Main GUI loop.
     */
    main() {
      execute.at('@s').run(() => {
        _.if(_.not(Selector('@p', { distance: [0, 1] })), () => {
          this.close()
        })
      })

      this.returnItems()
      this.clickDetection()
    }


    /**
     * Closes the GUI entity.
     */
    close() {

      this.Ids('@p').reset()

      tp(rel(0, -1000, 0))
      kill('@s')
    }


    /* -------------------------------------------------------------------------- */
    /*                              CLICK DETECTION                               */
    /* -------------------------------------------------------------------------- */

    /**
     * Detects item removal (click events).
     */
    clickDetection() {

      const clicked = Variable(0)

      execute.store.success(clicked).run(() => {
        clear('@p', `*[custom_data={${this.name}:1b}]`)
      })

      _.if(clicked, () => {
        this.clickFinder();
        this.refresh();
      })
    }


    /**
     * Returns items removed from the GUI to the player.
     */
    returnItems() {

      const copiedItems = Data('block', abs(930005, 0, 930005), 'Items')
      const guiItems = Data('entity', '@s', 'Items')

      copiedItems.set(guiItems)

      copiedItems
        .select(`[{components: {"minecraft:custom_data": {${this.name}: 1b}}}]`)
        .remove()

      const returnedItem = Variable(0)

      execute.store.result(returnedItem).run(() => {
        loot.give('@p')
          .mine(abs(930005, 0, 930005), 'stick[custom_data = {drop_contents: 1b}]')
      })

      _.if(returnedItem, () => {
        this.refresh()
      })
    }


    /* -------------------------------------------------------------------------- */
    /*                              PAGE MANAGEMENT                               */
    /* -------------------------------------------------------------------------- */
    // TYPE GUARD
    static isButton(e: Instruction | Button): e is Button {
      return 'slot' in e;
    }

    /**
     * Initializes all pages.
     */
    initPages(pages: Page[]) {
      pages.forEach(page => {
        this.pushPage(page)
      })
    }

    pushInstruction(page: Page, instruction: Instruction) {
      if (page.pushed) throw Error(
        `PRODIGELIB/GUI • Error: Page already pushed. \nTry using pushInstruction() before adding the page (${page.name}) to the menu (${this.name})`)
      if (!page.Buttons) page.Buttons = [];
      page.Buttons.push(instruction);
    }

    /**
     * Generates the function that fills the inventory for a page.
     */
    filler(page: Page & Required<Pick<Page, 'id'>>): MCFunctionType {
      return MCFunction(`__gui/${this.name}/pages/fill/${page.id}`, () => {
        page.Buttons?.forEach(e => this.readFillElement(e));
      })
    }

    readFillElement(e: Instruction | Button) {
      if (Init.isButton(e)) {
        this.placeItem(e);
      } else {
        e.fill();
      }
    }

    /**
     * Emit the button to a function
     * @param button Button emited
     */
    placeItem(button: Button) {
      // add custom_data if not already
      if (!button.customDataComponentAdded) {
        button.components = button.components ?? [];
        if (button.components) button.components.push(`custom_data={${this.name}: 1b}`);
        button.customDataComponentAdded = true;
      }

      const buttonString = Init.buttonToString(button as any);

      if (button.macroArgs) {
        const fn = MCFunction(`__gui/${this.name}/pages/fill/macros/${this.fillMacroCounter++}`, () => {
          raw(`$item replace entity @s container.${button.slot} with ${buttonString}`);
        });

        this.setMacroArgs(button);
        raw(`function ${fn.toString()} with storage ${this.macroStorage.currentTarget} ${this.macroStorage.path}`);

      } else {
        raw(`item replace entity @s container.${button.slot} with ${buttonString}`);
      }
    }

    /**
     * Sets macro arguments inside storage.
     */
    setMacroArgs(button: Button) {
      if (button.macroArgs) {
        button.macroArgs.forEach(argument => {
          Object.entries(argument).forEach(([key, value]: [string, any]) => {
            this.macroStorage
              .select(key)
              .set(value)
          })
        })
      }

    }

    /**
     * Generates the click detection function for a page.
     */
    clicker(page: Page): MCFunctionType {
      return MCFunction(`__gui/${this.name}/pages/click/${page.id}`, () => {
        // Add clickInstructions
        page.Buttons?.forEach(e => this.readClickElement(e));
      })
    }

    readClickElement(e: Instruction | Button) {
      if (Init.isButton(e)) {
        this.detectClick(e);
      } else {
        e.click()
      }
    }

    /**
     * Detect the click of the player on a slot and run the associated function button.onClick()
     * @param button Button clicked on
     */
    detectClick(button: Button) {
      if (button.macroArgs) {
        const macroCounter = this.clickMacroCounter++;
        const onClickMCFunction = MCFunction(`__gui/${this.name}/pages/click/onclickmacro/${macroCounter}`, () => {
          if (button.onClick) button.onClick();
        });

        const fn = MCFunction(`__gui/${this.name}/pages/click/macros/${macroCounter}`, () => {
          if (button.onClick) {
            raw(`$execute unless data entity @s Items[{Slot:$(slot)b}] run function ${onClickMCFunction.toString()}`);
          }
        });
        this.setMacroArgs(button);
        raw(`function ${fn.toString()} with storage ${this.macroStorage.currentTarget} ${this.macroStorage.path}`);
      } else {
        _.if(_.not(_.data(Data('entity', '@s', `Items[{Slot:${button.slot}b}]`))), () => {
          if (button.onClick) { button.onClick(); }
        })
      }
    }

    /* -------------------------------------------------------------------------- */
    /*                               GUI TRIGGER                                  */
    /* -------------------------------------------------------------------------- */

    /**
     * Creates the trigger command handler.
     */
    defineTrigger(): MCFunctionType {
      return MCFunction(`__gui/${this.name}/trigger`, () => {
        execute.as('@a').at('@s').run(() => {
          const triggerScore = Objective.create(this.triggerCmd, 'trigger')
          _.if(triggerScore('@s'), () => {
            triggerScore('@s').reset()
            this.summonEntity()
          })
          scoreboard.players.enable('@s', triggerScore)
        })
      }, { runEveryTick: true })
    }


    /**
     * Spawns the GUI entity.
     */
    summonEntity() {

      const isfree = _.block(rel(0, 0, 0), 'air')
      const newGui = Label('newGui')

      _.if(
        _.and(
          _.not(Selector('@e', { type: 'chest_minecart', tag: [this.GUILabel] })),
          isfree
        ),
        () => {

          summon(
            'chest_minecart',
            rel(0, 1, 0),
            { Tags: [this.GUILabel, newGui], Silent: true, Invulnerable: true, NoGravity: true }
          )

          const globalId = this.Ids('.global')['++']
          const playerId = this.Ids('@s')

          const guiEntity = Selector('@e', { limit: 1, tag: [this.GUILabel, newGui] })
          const guiEntityId = this.Ids(guiEntity)

          playerId.set(guiEntityId.set(globalId))

          execute.as(guiEntity).run(() => {
            this.pageIdScore.set(0)
          })

          execute.as(guiEntity).run(() => {
            this.refresh()
          })

          newGui(guiEntity).remove()

        }
      ).else(() => {

        tellraw('@s', 'No space, or too close to another GUI')

      })
    }


    /* -------------------------------------------------------------------------- */
    /*                               PAGE UPDATE                                  */
    /* -------------------------------------------------------------------------- */

    /**
     * Regenerates the inventory content for the current page.
     */
    defineRefresh(): MCFunctionType {

      return MCFunction(`__gui/${this.name}/refresh`, () => {

        Data('entity', '@s').select('Items').remove()

        Data('storage', 'prodiges_skills:gui', 'refresh').select('pageId')
          .set(this.pageIdScore)

        functionCmd(
          MCFunction(`__gui/${this.name}/pages/fillfindpage`, () => {
            raw(`$function prodige_skills:__gui/${this.name}/pages/fill/$(pageId)`)
          }),
          'with',
          'storage',
          'prodiges_skills:gui',
          'refresh'
        )

      })
    }


    /**
     * Finds the correct click handler for the current page.
     */
    defineClickFinder(): MCFunctionType {

      return MCFunction(`__gui/${this.name}/clickfinder`, () => {

        Data('storage', 'prodiges_skills:gui', 'clickFinder').select('pageId')
          .set(this.pageIdScore)

        functionCmd(
          MCFunction(`__gui/${this.name}/pages/clickfindpage`, () => {
            raw(`$function prodige_skills:__gui/${this.name}/pages/click/$(pageId)`)
          }),
          'with',
          'storage',
          'prodiges_skills:gui',
          'clickFinder'
        )

      })
    }


    /* -------------------------------------------------------------------------- */
    /*                                PUBLIC API                                  */
    /* -------------------------------------------------------------------------- */

    /**
     * Adds a page to the GUI.
     */
    public pushPage(page: Page) {
      if (this.Pages.includes(page)) throw Error(`The page ${page.name} already exists`);

      page.id = this.pageId++;

      const pageWithId = page as Page & { id: number }

      this.Pages.push(pageWithId)

      this.filler(pageWithId)
      this.clicker(pageWithId)

      page.pushed = true;
    }

    /**
     * Switches the GUI to another page.
     */
    public toPage(page: Page) {
      this.pageIdScore.set(page.id as number)
    }
  }
}

// loot table

LootTable('minecraft:blocks/yellow_shulker_box', { type: "minecraft:block", pools: [{ rolls: 1, bonus_rolls: 0, entries: [{ type: "minecraft:item", name: "minecraft:yellow_shulker_box", functions: [{ function: "minecraft:copy_components", source: "block_entity", include: ["minecraft:custom_name", "minecraft:container", "minecraft:lock", "minecraft:container_loot"] }] }], conditions: [{ condition: "minecraft:inverted", term: { condition: "minecraft:match_tool", predicate: { predicates: { "minecraft:custom_data": { drop_contents: 1 } } } } }] }, { rolls: 1, bonus_rolls: 0, entries: [{ type: "minecraft:dynamic", name: "minecraft:contents" }], conditions: [{ condition: "minecraft:match_tool", predicate: { predicates: { "minecraft:custom_data": { drop_contents: 1 } } } }] }], random_sequence: "minecraft:blocks/yellow_shulker_box", __smithed__: { priority: { stage: "early" }, rules: [{ type: "append", target: "pools[0].conditions", source: { type: "reference", path: "pools[0].conditions[0]" } }, { type: "append", target: "pools", source: { type: "reference", path: "pools[1]" } }] } } as any)