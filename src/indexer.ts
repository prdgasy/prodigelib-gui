import { Data, DataPointClass, NBT } from "sandstone";
type pageRec = Record<string, number>;

class IndexerClass {
  indexId: number;
  dataPointer: DataPointClass<'storage'>;
  static globalId = 0;

  constructor(values: pageRec) {
    this.indexId = IndexerClass.globalId++;
    this.dataPointer = Data('storage', '__gui:indexer', `indexer_${this.indexId}`);
    for (const [key, value] of Object.entries(values)) {
      this.dataPointer.select(key).set(value);
    }

  }

  set(key: string, index: number) {
    this.dataPointer.select(key).set(index);
  }

  get(key: string) {
    return this.dataPointer.select(key);
  };

}

export function Indexer(values?: pageRec): IndexerClass {
  return new IndexerClass(
    values ?? {}
  );
}