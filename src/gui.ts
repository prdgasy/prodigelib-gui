import {
	Macro as $,
	_, abs, Data, DataPointClass,
	defaultNamespace,
	execute, forceload,
	kill, Label, LabelClass,
	LootTable,
	MCFunction, NonEmptyString, Objective, ObjectiveClass,
	rel, Score, scoreboard, Selector, setblock, summon, tellraw, tp, Variable
} from 'sandstone';


import { CjMap } from '@prodigelib/cjmap';
import { VectorClass } from 'sandstone/variables';
import { Button } from './button';
import { NavigationButtonsOptions, PaginatedPage } from './features/paginatedPage';
import { PageClass, PageOptions } from './page';
import { GuiObject, MCFunctionType, SoundEvent } from './types';

export class Gui {
	public static instances: Gui[] = [];
	public name: string;
	public trigger!: Score;
	public tag!: LabelClass;
	public pages: PageClass[] = [];
	private currentItems = Data('entity', '@s', 'Items');
	public static ns = defaultNamespace.toString();

	public static storage = Data('storage', `${Gui.ns}:prodigelib`, 'gui');
	public pageScore!: Score;
	private linkId!: ObjectiveClass;
	private shulkerBoxPos!: VectorClass<any>;
	public data!: DataPointClass;
	public title: string;
	public pageMap!: CjMap<string, number>;

	public pageNames = new Set<string>();


	static globalId = 0;

	constructor(name?: string, triggerCommandString?: string, chatLog = false) {
		Gui.instances.push(this);
		this.title = name ?? `§dMenu ${Gui.globalId++}`;
		this.name = Gui.toResource(this.title);
		this.pageMap = new CjMap([], this.name);


		MCFunction(`__lib/gui/${this.name}/load`, () => {
			this.defineTrigger(triggerCommandString);

			this.data = Gui.storage.select(this.name);
			this.pageScore = Objective.create(`__lib.gui.${this.name}.page`)('@s');


			this.linkId = Objective.create(`__lib.gui.${this.name}.id`);
			this.tag = Label(`__lib.gui.${this.name}` as NonEmptyString);

			this.findLinkedEntitys();

			this.setShulkerBox();

			if (chatLog) tellraw('@a', `§e[GUI/${this.name}] Loaded`);
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
		}, { onConflict: 'ignore' });

		return find(this.pageScore);
	}

	private onClick() {
		const onClickFn = MCFunction(`__lib/gui/${this.name}/on_click`, (_loop: any, pageId: Score) => {
			$.functionCmd($`${PageClass.getFunctionPath(this, pageId, 'click')}`);
		}, { onConflict: 'ignore' });

		return onClickFn(this.pageScore);
	}

	// == PUBLIC METHOD ==
	public close() {
		const fn = MCFunction(`__lib/gui/${this.name}/close`, () => {
			this.linkId('@p').reset();
			tp(rel(0, -1000, 0));
			kill('@s');
		}, { onConflict: 'ignore' });

		return fn();
	}

	public summon() {
		const isfree = _.and(_.block(rel(0, 0, 0), 'air'), _.not(Selector('@e', { type: 'chest_minecart', tag: [this.tag] })));
		const newTag = Label('this');

		_.if(isfree, () => {
			summon(
				'chest_minecart',
				rel(0, 1, 0),
				{ Tags: [this.tag, newTag], Silent: true, Invulnerable: true, NoGravity: true, CustomName: this.name }
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
		}, { onConflict: 'ignore' })

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

	public static toResource(s: string): string {
		return s
			.replace(/§./g, '')
			.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
			.trim()
			.toLowerCase()
			.replace(/\s+/g, '_')
			.replace(/[^a-z0-9_.\-\/]/g, '');
	}
	public static uninstall() {
		Gui.instances.forEach(gui => {
			scoreboard.objectives.remove(gui.trigger.objective);
			scoreboard.objectives.remove(gui.pageScore.objective);
		});
		Gui.storage.remove();
		const pos = 93000 + Gui.globalId++;
		forceload.remove([pos, pos]);
		CjMap.uninstall();
	}
}

LootTable('minecraft:blocks/yellow_shulker_box', { type: "minecraft:block", pools: [{ rolls: 1, entries: [{ type: "minecraft:alternatives", children: [{ type: "minecraft:dynamic", name: "minecraft:contents", condition: { type: "minecraft:match_tool", predicate: { predicates: { "minecraft:custom_data": { drop_contents: 1 } } } } }, { type: "minecraft:item", name: "minecraft:yellow_shulker_box", modifier: [{ type: "minecraft:copy_components", source: "block_entity", include: ["minecraft:custom_name", "minecraft:lock", "minecraft:container_loot"] }, { type: "minecraft:set_contents", component: "minecraft:container", entries: [{ type: "minecraft:dynamic", name: "minecraft:contents" }] }] }] }] }] });
