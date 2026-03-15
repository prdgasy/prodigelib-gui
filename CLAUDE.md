# Sandstone Template Project

Starter template for creating Minecraft datapacks and resource packs with [Sandstone](https://github.com/sandstone-mc/sandstone).

## Commands

```bash
bun dev:build    # Build the pack (outputs to `.sandstone/output/`)
bun dev:watch    # Watch mode - rebuilds on file changes, run this in a background shell and read from `.sandstone/watch.log` rather than your own background shell log
```

## Project Structure

```
src/
├── index.ts              # Entry point - import your files here
└── *.ts                  # Your datapack code files
sandstone.config.ts       # Pack configuration (name, namespace, formats)
.sandstone/output/        # Generated packs (created on build)
├── datapack/             # Generated datapack
│   ├── pack.mcmeta
│   └── data/
│       ├── <namespace>/  # Your namespace (default: "default", configured in sandstone.config.ts)
│       │   ├── function/*.mcfunction    # Generated MCFunctions
│       │   ├── advancement/*.json       # Advancements
│       │   ├── loot_table/*.json        # Loot tables
│       │   ├── recipe/*.json            # Recipes
│       │   ├── predicate/*.json         # Predicates
│       │   └── tags/<type>/*.json       # Tags (block, item, function, etc.)
│       ├── load/function/_private/      # Lantern Load internals
│       └── minecraft/tags/function/     # Minecraft function tags (load.json, tick.json)
└── resourcepack/         # Generated resource pack (if used)
    ├── pack.mcmeta
    └── assets/<namespace>/
        ├── models/
        ├── textures/
        └── ...
```

**Finding generated files:**
- MCFunctions: `.sandstone/output/datapack/data/<namespace>/function/<name>.mcfunction`
- The namespace is set in `sandstone.config.ts` (defaults to "default")
- Nested function names like `MCFunction('foo/bar', ...)` create `foo/bar.mcfunction`

The `datapack/` folder can be copied directly to `.minecraft/saves/<world>/datapacks/` or linked via config.

## Quick Start

```typescript
import { MCFunction, say, execute, Selector } from 'sandstone'

// Create a function that runs on load
MCFunction('hello', () => {
  say('Hello from Sandstone!')
}, { runOnLoad: true })

// Create a function that runs every tick
MCFunction('tick_loop', () => {
  execute.as(Selector('@a')).run(() => {
    // Commands here run as each player
  })
}, { runOnTick: true })
```

## Documentation

Full documentation: https://sandstone.dev

### Commands
[docs/features/commands.md](https://github.com/sandstone-mc/sandstone-documentation/blob/master/docs/features/commands.md)

Import commands directly: `import { give, effect, execute } from 'sandstone'`
- Subcommands accessed as properties: `effect.give(...)`, `effect.clear(...)`
- Commands with args called as functions: `give('@a', 'minecraft:diamond', 64)`
- Execute uses `.run()` for single commands or `.run(() => {...})` for multiple
```typescript
execute.as('@a').at('@s').run.setblock(rel(0, -1, 0), 'minecraft:dirt')
execute.as('@a').at('@s').run(() => {
  setblock(rel(0, 0, 0), 'minecraft:air')
  say('Hello!')
})
```

### Functions
[docs/features/functions.md](https://github.com/sandstone-mc/sandstone-documentation/blob/master/docs/features/functions.md)

- `MCFunction('name', () => {...})` - Creates a .mcfunction file
- `MCFunction('name', () => {...}, { runOnLoad: true })` - Runs on datapack load
- `MCFunction('name', () => {...}, { runOnTick: true })` - Runs every tick
- `{ lazy: true }` - Only creates file if called from another function
- Async functions with `sleep()`: `MCFunction('name', async () => { await sleep('1s') })`
- Inline functions (JS functions) don't create files, commands are inlined

**IMPORTANT: Synchronous Execution**
Everything inside an MCFunction (including all Flow control like `_.if`, `_.while`, `_.forScore`) executes **synchronously within a single game tick**. Minecraft processes all commands instantly - there is no "waiting" between commands. The only way to delay execution across ticks is with `sleep()` in an async MCFunction:
```typescript
MCFunction('delayed', async () => {
  say('This runs immediately')
  await sleep('1s')  // Waits 20 ticks (1 second)
  say('This runs 1 second later')
})
```

**Async Context**: By default, scheduled functions lose entity (`@s`) and position context because `schedule` runs from server context. Use `asyncContext: true` to preserve context:
```typescript
// WITHOUT asyncContext - @s and position are LOST after sleep
MCFunction('loses_context', async () => {
  execute.as('@p').at('@s').run(async () => {
    say('Player is @s here')
    await sleep('1s')
    say('Now @s is GONE - runs as server!')
  })
})

// WITH asyncContext - context is preserved
MCFunction('keeps_context', async () => {
  execute.as('@p').at('@s').run(async () => {
    say('Player is @s here')
    await sleep('1s')
    say('Still the same @s and position!')
  })
}, { asyncContext: true })
```
Under the hood, `asyncContext` works by:
1. Adding a **Label tag** to `@s` to mark entities waiting for this sleep
2. Storing **gametime + delay** as a score on `@s`
3. When scheduled time arrives, selecting all entities with that tag whose timer matches current gametime
4. Running the continuation `as` and `at` each matched entity

This elegantly handles multiple entities sleeping simultaneously - each wakes up independently when their timer expires.

### Macros & MCFunction Parameters
[docs/features/macros.md](https://github.com/sandstone-mc/sandstone-documentation/blob/master/docs/features/macros.md)

Macros allow runtime value substitution in commands using `$(variable)` syntax. Sandstone provides first-class macro support through MCFunction parameters and environment variables.

```typescript
const $ = Macro // common alias

const name = Data('storage', 'test', 'Name')

// [envVars], callback receives (_loop, ...params)
const test = MCFunction('test', [name], (_loop: typeof test, count: Score) => {
  // Use variables directly with Macro commands - Sandstone handles the $(name) conversion
  $.give(name, 'minecraft:diamond', {}, count)
})

MCFunction('foo', () => {
  name.set('MulverineX')
  const count = Objective.create('testing')('@s')

  // Call with score param - environment  cannot be overriden
  test(count)
})
```

#### Environment Variables vs Parameters
- **Environment variables**: Array as second MCFunction argument `[name]` - cannot be overridden at call time
- **Parameters**: Declared in callback after `_loop`: `(_loop, count: Score)` - passed at call time
- **Usage**: Reference the actual variables in `Macro` commands, not string placeholders

#### Macro Template Literals
Use `Macro` tagged template for dynamic paths:
```typescript
const thing = Data('storage', 'test', 'Thing')
const thingMap = Data('storage', 'test', 'Things')

const test = MCFunction('get_thing', (_loop, index: Score) => {
  // Dynamic array access at runtime
  $.data.storage.modify(thing).set.from.storage(thingMap.currentTarget, $`Things[${index}]`)
})
```

#### Important Limitations
- MCFunctions with macro variables **must** be called at compile-time to register macro names
- Variables used as parameters cannot be used normally within the same function; declare separately if needed
- Nesting not available in parameters; all must be at root level (spread operators work)

### Selectors
[docs/features/selectors.md](https://github.com/sandstone-mc/sandstone-documentation/blob/master/docs/features/selectors.md)

```typescript
import { Selector } from 'sandstone'
Selector('@e', { type: 'minecraft:cow', limit: 1, sort: 'random' })
Selector('@a', { scores: { kills: [10, Infinity] } })  // kills >= 10
Selector('@a', { tag: ['winner', 'alive'] })
```

### Variables & Scores
[docs/features/variables](https://github.com/sandstone-mc/sandstone-documentation/tree/master/docs/features/variables)

```typescript
import { Objective, Selector } from 'sandstone'
const kills = Objective.create('kills', 'playerKillCount')
const myKills = kills('@s')
myKills.add(1)
myKills.set(0)
myKills.greaterThan(10)  // Returns condition for use in _.if()
```

### Data & Data Points
[docs/features/variables/data.md](https://github.com/sandstone-mc/sandstone-documentation/blob/master/docs/features/variables/data.md)

NBT data can be stored in three places: **storage** (virtual), **entities**, or **blocks**. Use `Data` to create references:

```typescript
import { Data, DataVariable } from 'sandstone'

// Create data references (no commands emitted yet)
const pig = Data('entity', '@e[type=pig,limit=1]')
const chest = Data('block', '~ ~ ~')
const myStorage = Data('storage', 'mypack:data')

// Select a path to get a DataPoint
const health = pig.select('Health')
const items = chest.select('Items')
const savedUUID = myStorage.select('player_uuid')

// Shorthand: call Data with path directly
const tags = Data('entity', '@s', 'Tags')
```

**Operations** - All return the data point for chaining:
```typescript
health.set(20)                        // Set value
health.set(otherDataPoint)            // Copy from another data point
health.set(score)                     // Set from score (converted to NBT)
tags.append('marked')                 // Add to end of list
tags.prepend('priority')              // Add to start of list
items.insert({id: 'stone'}, 2)        // Insert at index
item.merge({Unbreakable: NBT.byte(1)}) // Merge NBT without overwriting other fields
tags.remove()                         // Remove this data point
```

**DataVariable** - Anonymous storage for intermediate values:
```typescript
const temp = DataVariable()           // Auto-generated storage path
const named = DataVariable(undefined, 'myVar')  // Named for debugging
const initialized = DataVariable({foo: 'bar'})  // With initial value
const fromScore = DataVariable(myScore)         // Score converted to NBT
```

**getTempStorage** - Shared temporary storage (cleared between uses):
```typescript
const { getTempStorage } = pack
const temp = getTempStorage('uuid')   // Returns __sandstone:temp.uuid
temp.set(someData)                    // Use for intermediate operations
```

**Comparison in conditions**:
```typescript
_.if(health.equals(20), () => { ... })
_.if(tags.equals(['marked']), () => { ... })
```

### Flow Control
[docs/features/flow](https://github.com/sandstone-mc/sandstone-documentation/tree/master/docs/features/flow)

```typescript
import { _ } from 'sandstone'
_.if(myKills.greaterThan(10), () => {
  say('On a rampage!')
}).elseIf(myKills.equalTo(0), () => {
  say('No kills yet')
}).else(() => {
  say('Keep going!')
})
```
- Conditions: score comparisons, `_.data.entity()`, `_.data.block()`, `_.block()`
- Loops: `_.forScore()`, `_.while()`, `_.doWhile()`
- Switch: `_.switch(score, [{case: 0, body: () => {...}}])`

### Coordinates
[docs/features/variables/coordinates.md](https://github.com/sandstone-mc/sandstone-documentation/blob/master/docs/features/variables/coordinates.md)

Commands that accept position arguments require coordinates to be strings, not raw numbers. Use coordinate helper functions:

```typescript
import { absolute, relative, local, setblock } from 'sandstone'

// Absolute coordinates (exact world position)
setblock(absolute(0, 64, 0), 'minecraft:stone')
// Shorthand: abs
import { abs } from 'sandstone'
setblock(abs(0, 64, 0), 'minecraft:stone')

// Relative coordinates (offset from executor position)
setblock(relative(0, -1, 0), 'minecraft:stone')  // One block below executor
setblock(relative(0, 0, 0), 'minecraft:stone')    // At executor position
// Shorthand: rel
import { rel } from 'sandstone'
setblock(rel(0, -1, 0), 'minecraft:stone')

// Local coordinates (relative to executor's rotation)
setblock(local(0, 0, 1), 'minecraft:stone')  // One block in front
// Shorthand: loc
import { loc } from 'sandstone'
setblock(loc(0, 0, 1), 'minecraft:stone')

// Mix absolute and relative
import { VectorClass } from 'sandstone'
const mixedPos = new VectorClass(['0', '~', '~5'])  // x=0 (absolute), y=~ (relative), z=~5 (relative)

// String arrays also work
setblock(['0', '64', '0'], 'minecraft:stone')

// WRONG: Do NOT pass raw number arrays
setblock([0, 64, 0], 'minecraft:stone')  // ❌ Type error - coordinates must be strings!
```

**Key Points:**
- Always use `abs()`, `rel()`, or `loc()` to convert numbers to coordinate strings
- String arrays like `['0', '64', '0']` work but are less readable
- Raw number arrays `[0, 64, 0]` will cause type errors and build failures
- These helpers return `VectorClass` instances that convert to space-separated strings (e.g., `"0 64 0"`)

### NBT Values

When working with NBT data (item components, entity data, block entity data), use `NBT` wrappers for numeric types:

```typescript
import { NBT, ItemPredicate } from 'sandstone'

// ✓ Correct - numbers need NBT wrappers
ItemPredicate('minecraft:diamond_sword').exact('minecraft:damage', NBT.int(0))
ItemPredicate('*').exact('minecraft:max_stack_size', NBT.int(64))

// ✗ Wrong - raw numbers cause type errors
ItemPredicate('minecraft:diamond_sword').exact('minecraft:damage', 0)  // Type error!

// Strings don't need wrapping
ItemPredicate('*').match('minecraft:custom_data', {
  player_name: 'Steve',  // ✓ String is fine as-is
  player_id: NBT.int(123)  // ✓ Number needs NBT.int()
})

// Booleans don't need wrapping
ItemPredicate('*').exact('minecraft:hide_tooltip', {})  // ✓ Empty object for boolean component
```

**NBT Wrapper Rules:**
- **Integers**: Use `NBT.int(value)` for whole numbers (damage, counts, IDs)
- **Floats**: Use `NBT.float(value)` for decimal numbers with less precision
- **Doubles**: Raw numbers work for doubles (no wrapper needed)
- **Strings**: No wrapper needed - use plain strings
- **Booleans**: Use `true` or `false` directly - do NOT use `NBT.byte()`

**Why the wrappers?**
Minecraft's NBT (Named Binary Tag) format distinguishes between different numeric types (byte, short, int, long, float, double). The wrappers ensure your values have the correct NBT type tag.

### Resources
[docs/features/resources](https://github.com/sandstone-mc/sandstone-documentation/tree/master/docs/features/resources)

Create datapack resources with type-safe builders:
- `Advancement('name', {...})` - Advancements
- `LootTable('name', {...})` - Loot tables
- `Predicate('name', {...})` - Predicates
- `Recipe('name', {...})` - Recipes
- `Tag('type', 'name', [...])` - Tags (blocks, items, functions, etc.)
- Many more

### Configuration
[docs/features/config.md](https://github.com/sandstone-mc/sandstone-documentation/blob/master/docs/features/config.md)

## Configuration

Edit `sandstone.config.ts` to change:
- `name`: Pack folder name
- `namespace`: Default namespace for resources
- `packs.datapack.packFormat`: Data pack format version
- `packs.resourcepack.packFormat`: Resource pack format version
- `mcmeta`: Minecraft version for type generation (`'latest'` or specific version)

### Pack Formats

**Always check [Pack format](https://minecraft.wiki/w/Pack_format) for current version numbers** - these change frequently with snapshots.

26.1.x will be the first supported stable release. Until 26.1.0 is released, use the latest snapshot pack formats from the wiki.
