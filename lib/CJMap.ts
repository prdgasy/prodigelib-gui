import { Data, DataPointClass, MCFunction, Score, Variable, _, Macro as $, data, DataVariable, execute } from "sandstone";

type Entry<K extends number | string, V extends number | string> = [K, V];

export class CJMap<K extends number | string, V extends number | string> {
  private map: DataPointClass;
  private args!: DataPointClass;
  private out: DataPointClass;
  private name: string;
  private static storage = Data('storage', 'prodigelib:prodigelib', 'map');
  private static id = 0;
  constructor(entries?: Entry<K, V>[], name?: string) {
    this.name = name ?? `map_${CJMap.id++}`;
    this.map = CJMap.storage.select(this.name);
    this.args = this.map.select('args');
    this.out = this.args.select('out');
    if (entries) this.set(...entries);
  }

  public toStorage() {
    return this.map;
  }

  public set(...entries: Entry<K, V>[]) {
    entries.forEach(([rawKey, rawValue]) => {
      if (typeof rawKey === 'string' || typeof rawKey === 'number') {
        this.map.select(String(rawKey)).set(rawValue);
      }
      else {
        const key = this.args.select('key');
        key.set(rawKey);
        _.with([key], () => $.data.modify(this.map.select($`${key}`)).set.value(rawValue));
      }
    });
  }

  public size(): Score {
    const v = Variable();
    execute.store.result(v).run.data.get(this.map);

    return v;
  }

  public get(rawKey: Score | DataPointClass | number | string): DataPointClass {
    if (typeof rawKey === 'string' || typeof rawKey === 'number') {
      this.out.set(this.map.select(String(rawKey)));
    } else {
      const key = this.args.select('key');
      key.set(rawKey);
      _.with([key], () => $.data.modify(this.out).set.from(this.map.select($`${key}`)));
    }

    return this.out;
  }
}