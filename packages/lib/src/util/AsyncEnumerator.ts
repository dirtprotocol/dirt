export interface IAsyncEnumerableSource<T> {
  count(): Promise<number>;
  itemAtIndex(index: number): Promise<T>;
}

export interface IAsyncBatchEnumerableSource<T> extends
    IAsyncEnumerableSource<T> {
  itemsAtIndex: (index: number, count: number) => Promise<T[]>;
}

export interface IAsyncEnumerator<T> {
  count: number;
  current: T;

  next(): Promise<boolean>;

  reset(): void;
}

export class BatchAsyncEnumerator<T> implements IAsyncEnumerator<T> {
  count = -1;
  current: T = null;

  private cache: T[];
  private index = 0;
  private cacheIndex = 0;

  constructor(
      private source: IAsyncBatchEnumerableSource<T>, private batchSize = 10) {}

  async next(): Promise<boolean> {
    if (this.count == -1) {
      this.count = await this.source.count();
    }

    if (this.index == this.count) {
      return false;
    }

    if (this.popCache()) {
      return true;
    }

    this.cache =
        await this.source.itemsAtIndex(this.cacheIndex, this.batchSize);
    this.cacheIndex += this.cache.length;

    return this.popCache();
  }

  reset() {
    this.index = 0;
    this.current = null;
  }

  private popCache(): boolean {
    if (this.cache.length <= 0) {
      return false;
    }

    this.current = this.cache.shift();
    this.index++;
    return true;
  }
}

export class AsyncEnumerator<T> implements IAsyncEnumerator<T> {
  count = -1;
  current: T = null;
  private index = 0;

  constructor(private source: IAsyncEnumerableSource<T>) {}

  async next(): Promise<boolean> {
    if (this.count == -1) {
      this.count = await this.source.count();
    }

    if (this.index == this.count) {
      return false;
    }

    this.current = await this.source.itemAtIndex(this.index);
    this.index++;

    return true;
  }

  reset() {
    this.index = 0;
    this.current = null;
  }
}