import {
  _, Data, execute, Label, MCFunction, Objective, rel, Score, scoreboard,
  Selector, summon, tellraw, functionCmd, raw, kill, tp, abs,
  forceload, loot, Variable, clear, LootTable, give
} from 'sandstone'

import { LabelClass, ObjectiveClass } from 'sandstone/variables'

class Item {
  id: ITEMS
  name?: string
  lore?: string[]
  components?: string[]


  constructor(itemId: ITEMS, name?: string, lore?: string[], components?: string[]) {
    this.id = itemId
    this.name = name
    this.lore = lore
    this.components = components
  }

  convertLore(): string[] {
    const loreEmit: string[] = []
    if (this.lore) {
      this.lore.forEach(line => {
        loreEmit.push(`{text:"${line}"}`)
      })
    }
    return loreEmit
  }

  toString() {
    const loreEmit = this.convertLore()
    if (this.components) {
      return `${this.id}[${this.components.toString()},custom_name={text:"${this.name}"}, lore=[${loreEmit.toString()}]]`
    } else {
      return `${this.id}[custom_name={text:"${this.name}"}, lore=[${loreEmit.toString()}]]`
    }

  }
}


/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */


type MCFunctionType = ReturnType<typeof MCFunction>
type ITEMS = Parameters<typeof give>[1]

export type MacroArg = {
  key: string
  value: any
}

/**
 * Represents a clickable GUI button.
 */
export type Button = {

  id: ITEMS
  slot: number
  count?: number

  name?: string
  lore?: string[]
  components?: string[]
  customDataComponentAdded?: boolean

  onClick?: MCFunctionType

  macroArgs?: MacroArg[]
  isFiller?: boolean
}

/**
 * Represents a GUI page.
 */
export type GUIPage = {
  name: string
  buttons: Button[]
  id?: number
}


LootTable('minecraft:blocks/yellow_shulker_box', { type: "minecraft:block", pools: [{ rolls: 1, bonus_rolls: 0, entries: [{ type: "minecraft:item", name: "minecraft:yellow_shulker_box", functions: [{ function: "minecraft:copy_components", source: "block_entity", include: ["minecraft:custom_name", "minecraft:container", "minecraft:lock", "minecraft:container_loot"] }] }], conditions: [{ condition: "minecraft:inverted", term: { condition: "minecraft:match_tool", predicate: { predicates: { "minecraft:custom_data": { drop_contents: 1 } } } } }] }, { rolls: 1, bonus_rolls: 0, entries: [{ type: "minecraft:dynamic", name: "minecraft:contents" }], conditions: [{ condition: "minecraft:match_tool", predicate: { predicates: { "minecraft:custom_data": { drop_contents: 1 } } } }] }], random_sequence: "minecraft:blocks/yellow_shulker_box", __smithed__: { priority: { stage: "early" }, rules: [{ type: "append", target: "pools[0].conditions", source: { type: "reference", path: "pools[0].conditions[0]" } }, { type: "append", target: "pools", source: { type: "reference", path: "pools[1]" } }] } } as any)
/* -------------------------------------------------------------------------- */
/*                                   GUI                                      */
/* -------------------------------------------------------------------------- */

/**
 * Main GUI controller.
 * Handles page management, click detection and entity linking.
 */
export class GUI {

  name: string
  triggerCmd: string

  Pages: GUIPage[] = []
  pageId = 0

  pageIdScore: Score

  Ids: ObjectiveClass
  GUILabel: LabelClass

  refresh: MCFunctionType
  clickFinder: MCFunctionType


  constructor(name: string, triggerCmd: string, pages?: GUIPage[]) {

    this.name = name
    this.triggerCmd = triggerCmd

    this.pageIdScore = Objective.create(`${name}.gui.page`)('@s')

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

  /**
 * Converts the button into a valid Minecraft item string.
 */
  static buttonToString(button: Button): string {
    return new Item(button.id, button.name, button.lore, button.components).toString()
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
      this.clickFinder()
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

  /**
   * Initializes all pages.
   */
  initPages(pages: GUIPage[]) {

    pages.forEach(page => {
      this.pushPage(page)
    })
  }


  /**
   * Adds a page to the GUI.
   */
  pushPage(page: GUIPage) {

    const newPageId = this.pageId++
    let macroId = 0

    page.id = newPageId

    this.Pages.push(page)

    this.filler(page, macroId, newPageId)
    this.clicker(page, macroId, newPageId)
  }


  /**
   * Generates the function that fills the inventory for a page.
   */
  filler(page: GUIPage, macroId: number, newPageId: number): MCFunctionType {

    return MCFunction(`__gui/${this.name}/pages/fill/${newPageId}`, () => {

      page.buttons.forEach(button => {

        if (!button.customDataComponentAdded) {
          button.components = button.components ?? []
          if (button.components) button.components.push(`custom_data={${this.name}: 1b}`)
          button.customDataComponentAdded = true
        }
        const buttonString = GUI.buttonToString(button)

        if (button.macroArgs) {

          this.setMacroArgs(button)

          functionCmd(
            MCFunction(`__gui/${this.name}/pages/fill/${newPageId}/macro_${macroId++}`, () => {
              raw(`$item replace entity @s container.${button.slot} with ${buttonString}`)
            }),
            'with',
            'storage',
            'prodiges_skills:gui',
            'pushPage'
          )

        } else {

          raw(`item replace entity @s container.${button.slot} with ${buttonString}`)

        }

      })

    })
  }


  /**
   * Generates the click detection function for a page.
   */
  clicker(page: GUIPage, macroId: number, newPageId: number): MCFunctionType {

    return MCFunction(`__gui/${this.name}/pages/click/${newPageId}`, () => {

      page.buttons.forEach(button => {
        if (!button.isFiller && button.onClick) {
          _.if(_.not(_.data(Data('entity', '@s', `Items[{Slot:${button.slot}b}]`))), () => {
            if (button.onClick) { button.onClick(); this.refresh() }
          })
        } else if (button.isFiller && button.onClick) {
          throw Error(`Button: ${button.id} (${button}) is marked as filler but has an onClick function`)
        } else {
          _.if(_.not(_.data(Data('entity', '@s', `Items[{Slot:${button.slot}b}]`))), () => {
            this.refresh()
          })
        }


      })

    })
  }


  /**
   * Sets macro arguments inside storage.
   */
  setMacroArgs(button: Button) {

    if (!button.macroArgs) {
      throw Error('No macro arguments given')
    }

    button.macroArgs.forEach(argument => {

      Data('storage', 'prodiges_skills:gui', 'pushPage')
        .select(argument.key)
        .set(argument.value)

    })
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
   * Switches the GUI to another page.
   */
  public toPage(page: GUIPage) {

    this.pageIdScore.set(page.id as number)

    this.refresh()
  }

}