import {
  _, Data, execute, Label, MCFunction, Objective, rel, Score, scoreboard,
  Selector, summon, tellraw, functionCmd, raw, kill, tp, abs,
  forceload, loot, Variable, clear, LootTable, give,
  sandstonePack,
  setblock, DataPointClass, LabelClass, ObjectiveClass

} from 'sandstone'

import { Indexer } from './indexer';


import { Text, MCFunctionType, MenuObject } from './types';
import { PageClass } from './page';
import { ButtonClass } from './button';

export class GUI {

  name: string
  triggerCmd: string

  Pages: PageClass[] = []

  macroStorage: DataPointClass<'storage'>
  pageIdScore: Score;
  pageNameIndex = Indexer();

  Ids: ObjectiveClass
  GUILabel: LabelClass

  refresh: MCFunctionType
  clickFinder: MCFunctionType;

  datapackId: number;


  constructor(name: string, triggerCmd: string, datapackId: number) {

    this.name = name
    this.triggerCmd = triggerCmd

    this.pageIdScore = Objective.create(`${name}.page`)('@s')

    this.macroStorage = Data('storage', `${sandstonePack.defaultNamespace}:${this.name}`, '__gui.macroKeys');

    this.Ids = Objective.create(`${name}.gui.id`)
    this.GUILabel = Label(`${name}.gui`)



    this.defineTrigger()
    this.findObjs()

    this.refresh = this.defineRefresh()
    this.clickFinder = this.defineClickFinder()

    this.datapackId = datapackId;
    forceload.add([this.datapackId, this.datapackId]);
    setblock(abs(this.datapackId, 0, this.datapackId), 'yellow_shulker_box');
  }


  /* -------------------------------------------------------------------------- */
  /*                             ENTITY MANAGEMENT                              */
  /* -------------------------------------------------------------------------- */

  /**
   * Links players and GUI entities that share the same ID.
   */
  findObjs(): MCFunctionType {

    return MCFunction(`__gui/${this.name.toLowerCase()}/findobjs`, () => {

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

    const copiedItems = Data('block', abs(this.datapackId, 0, this.datapackId), 'Items')
    const guiItems = Data('entity', '@s', 'Items')

    copiedItems.set(guiItems)

    copiedItems
      .select(`[{components: {"minecraft:custom_data": {${this.name}: 1b}}}]`)
      .remove()

    const returnedItem = Variable(0)

    execute.store.result(returnedItem).run(() => {
      loot.give('@p')
        .mine(abs(this.datapackId, 0, this.datapackId), 'stick[custom_data = {drop_contents: 1b}]')
    })

    _.if(returnedItem, () => {
      this.refresh()
    })
  }


  /* -------------------------------------------------------------------------- */
  /*                              PAGE MANAGEMENT                               */
  /* -------------------------------------------------------------------------- */
  // TYPE GUARD
  static isButton(e: MenuObject): e is ButtonClass {
    return 'slot' in e;
  }



  /* -------------------------------------------------------------------------- */
  /*                               GUI TRIGGER                                  */
  /* -------------------------------------------------------------------------- */

  /**
   * Creates the trigger command handler.
   */
  defineTrigger(): MCFunctionType {
    return MCFunction(`__gui/${this.name.toLowerCase()}/trigger`, () => {
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

    return MCFunction(`__gui/${this.name.toLowerCase()}/refresh`, () => {

      Data('entity', '@s').select('Items').remove()

      Data('storage', 'prodiges_skills:gui', 'refresh').select('pageId')
        .set(this.pageIdScore)

      functionCmd(
        MCFunction(`__gui/${this.name.toLowerCase()}/pages/fillfindpage`, () => {
          raw(`$function prodige_skills:__gui/${this.name.toLowerCase()}/pages/fill/$(pageId)`)
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

    return MCFunction(`__gui/${this.name.toLowerCase()}/clickfinder`, () => {

      Data('storage', 'prodiges_skills:gui', 'clickFinder').select('pageId')
        .set(this.pageIdScore)

      functionCmd(
        MCFunction(`__gui/${this.name.toLowerCase()}/pages/clickfindpage`, () => {
          raw(`$function prodige_skills:__gui/${this.name.toLowerCase()}/pages/click/$(pageId)`)
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
  public toPage(page: PageClass | string) {
    if (typeof page != 'string') {
      if (page.id) this.pageIdScore.set(page.id);
    } else {
      this.pageIdScore.set(this.pageNameIndex.get(page));
    }
  }
}


// loot table

LootTable('minecraft:blocks/yellow_shulker_box', { type: "minecraft:block", pools: [{ rolls: 1, bonus_rolls: 0, entries: [{ type: "minecraft:item", name: "minecraft:yellow_shulker_box", functions: [{ function: "minecraft:copy_components", source: "block_entity", include: ["minecraft:custom_name", "minecraft:container", "minecraft:lock", "minecraft:container_loot"] }] }], conditions: [{ condition: "minecraft:inverted", term: { condition: "minecraft:match_tool", predicate: { predicates: { "minecraft:custom_data": { drop_contents: 1 } } } } }] }, { rolls: 1, bonus_rolls: 0, entries: [{ type: "minecraft:dynamic", name: "minecraft:contents" }], conditions: [{ condition: "minecraft:match_tool", predicate: { predicates: { "minecraft:custom_data": { drop_contents: 1 } } } }] }], random_sequence: "minecraft:blocks/yellow_shulker_box", __smithed__: { priority: { stage: "early" }, rules: [{ type: "append", target: "pools[0].conditions", source: { type: "reference", path: "pools[0].conditions[0]" } }, { type: "append", target: "pools", source: { type: "reference", path: "pools[1]" } }] } } as any)