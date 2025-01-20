import Basil from "basil.js";

type Storage = "local" | "cookie" | "session" | "memory";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DAY_PER_YEAR = 365;
const DEFAULT_STORAGES: Storage[] = ["local", "cookie", "session", "memory"];

export type CascadeStorageOptions = Omit<Basil.BasilOptions, "storages" | "raw"> & {
  /**
   * If provided, only these storages (in this order) will be used
   * for set/get/remove/keys. Default is ['local', 'cookie', 'session', 'memory'].
   */
  storages?: Storage[];

  /**
   * If true, data is stored "as-is" (raw string in basil.js),
   * skipping JSON serialization and ignoring expiration logic.
   */
  raw?: boolean;
};

export default class CascadeStorage implements Basil.BasilInstance {
  #storages: Storage[];
  #storageMap: Record<Storage, Basil.BasilInstance>;

  public options: CascadeStorageOptions;

  constructor(options?: CascadeStorageOptions) {
    this.options = {
      namespace: "c45c4d3-570r463",
      storages: DEFAULT_STORAGES,
      expireDays: DAY_PER_YEAR,
      keyDelimiter: ".",
      raw: false,
      ...options,
    };

    this.#storages = this.options.storages ?? DEFAULT_STORAGES;
    this.#storageMap = {
      cookie: new Basil({ ...this.options, storages: ["cookie"] }),
      local: new Basil({ ...this.options, storages: ["local"] }),
      session: new Basil({ ...this.options, storages: ["session"] }),
      memory: new Basil({ ...this.options, storages: ["memory"] }),
    };
  }

  public init(options?: CascadeStorageOptions): this {
    this.setOptions(options);
    return this;
  }

  public setOptions(options?: CascadeStorageOptions): void {
    this.options = { ...this.options, ...options };

    this.#storages = this.options.storages ?? DEFAULT_STORAGES;
    this.#storageMap.cookie.setOptions({
      ...this.options,
      storages: ["cookie"],
    });
    this.#storageMap.local.setOptions({ ...this.options, storages: ["local"] });
    this.#storageMap.session.setOptions({
      ...this.options,
      storages: ["session"],
    });
    this.#storageMap.memory.setOptions({
      ...this.options,
      storages: ["memory"],
    });
  }

  public check(storage: Storage): boolean {
    return this.#storageMap[storage].check(storage);
  }

  public support(storage: Storage): boolean {
    return this.#storageMap[storage].support(storage);
  }

  public set<T = unknown>(
    key: string | number | boolean | null | (string | number | boolean | null)[],
    value: T,
    options?: CascadeStorageOptions,
  ): boolean {
    const { raw, expireDays } = { expireDays: DAY_PER_YEAR, ...this.options, ...options };
    const expires = Date.now() + expireDays * MS_PER_DAY;
    const data = raw ? value : { value, expires };

    let storedSomewhere = false;
    for (const storage of this.#storages) {
      if (this.check(storage)) {
        const stored = this.#storageMap[storage].set(key, data, options);
        storedSomewhere = storedSomewhere || stored;
      }
    }
    return storedSomewhere;
  }

  public get<T = unknown>(
    key: string | number | boolean | null | (string | number | boolean | null)[],
    options?: CascadeStorageOptions,
  ): T | null {
    for (const storage of this.#storages) {
      if (!this.check(storage)) continue;

      const val = this.#getAndCheckExpiration<T>(storage, key, options);
      if (val !== null) return val;
    }
    return null;
  }

  public remove(
    key: string | number | boolean | null | (string | number | boolean | null)[],
    options?: CascadeStorageOptions,
  ): void {
    for (const storage of this.#storages) {
      if (this.check(storage)) {
        this.#storageMap[storage].remove(key, options);
      }
    }
  }

  public reset(options?: CascadeStorageOptions): void {
    for (const storage of this.#storages) {
      if (this.check(storage)) {
        this.#storageMap[storage].reset(options);
      }
    }
  }

  public keys(options?: CascadeStorageOptions): string[] {
    let keys: string[] = [];
    for (const storage of this.#storages) {
      if (this.check(storage)) {
        keys = keys.concat(this.#storageMap[storage].keys(options));
      }
    }
    keys = Array.from(new Set(keys));

    return keys.filter((key) => {
      for (const storage of this.#storages) {
        if (!this.check(storage)) continue;
        const value = this.#getAndCheckExpiration(storage, key, options);
        if (value !== null) return true;
      }
      return false;
    });
  }

  public keysMap(options?: CascadeStorageOptions): Record<string, Storage[]> {
    const keys = this.keys(options);
    const keysMap: Record<string, Storage[]> = {};

    for (const key of keys) {
      const storages: Storage[] = [];
      for (const storage of this.#storages) {
        if (!this.check(storage)) continue;

        const value = this.#getAndCheckExpiration(storage, key, options);
        if (value !== null) {
          storages.push(storage);
        }
      }
      if (storages.length) {
        keysMap[key] = storages;
      }
    }

    return keysMap;
  }

  #getAndCheckExpiration<T>(
    storage: Storage,
    key: string | number | boolean | null | (string | number | boolean | null)[],
    options?: CascadeStorageOptions,
  ): T | null {
    const { raw } = { ...this.options, ...options };
    const data = this.#storageMap[storage].get<{
      value: T;
      expires: number | null;
    }>(key, options);
    if (data === null) return null;
    if (raw) return data as T;

    if (data.expires !== null && Date.now() > data.expires) {
      this.#storageMap[storage].remove(key, options);
      return null;
    }

    return data.value ?? null;
  }
}
