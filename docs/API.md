# API Reference

## Table of Contents

- [CascadeStorage Class](#cascadestorage-class)
  - [Constructor](#constructor)
  - [init(options?: CascadeStorageOptions): this](#initoptions-cascadestorageoptions-this)
  - [setOptions(options?: CascadeStorageOptions): void](#setoptionsoptions-cascadestorageoptions-void)
  - [support(storageType: "local" \| "cookie" \| "session" \| "memory"): boolean](#supportstoragetype-local--cookie--session--memory-boolean)
  - [check(storageType: "local" \| "cookie" \| "session" \| "memory"): boolean](#checkstoragetype-local--cookie--session--memory-boolean)
  - [set\<T\>(key, value, options?): boolean](#settkey-string--number--boolean--null--string--number--boolean--null-value-t-options-cascadestorageoptions-boolean)
  - [get\<T\>(key, options?): T \| null](#gettkey-string--number--boolean--null--string--number--boolean--null-options-cascadestorageoptions-t--null)
  - [remove(key, options?): void](#removekey-string--number--boolean--null--string--number--boolean--null-options-cascadestorageoptions-void)
  - [reset(options?: CascadeStorageOptions): void](#resetoptions-cascadestorageoptions-void)
  - [keys(options?: CascadeStorageOptions): string[]](#keysoptions-cascadestorageoptions-string)
  - [keysMap(options?: CascadeStorageOptions): Record\<string, Array\<"local" \| "cookie" \| "session" \| "memory"\>\>](#keysmapoptions-cascadestorageoptions-recordstring-arraylocal--cookie--session--memory)
- [CascadeStorageOptions](#cascadestorageoptions)

## CascadeStorage Class

**CascadeStorage** is a class to provides a fallback mechanism and ensures consistent expiration behavior across storages.

### Constructor

```ts
constructor(options?: CascadeStorageOptions)
```

Creates a new `CascadeStorage` instance. See [CascadeStorageOptions](#cascadestorageoptions) for details on all supported properties.

**Example**:

```ts
const storage = new CascadeStorage({
  namespace: "my-app",
  storages: ["local", "session"],
  expireDays: 30,
  keyDelimiter: ":",
  raw: true,
});
```

---

### `init(options?: CascadeStorageOptions): this`

Re-initializes the instance with the given options:

```ts
storage.init({ storages: ["memory"] });
```

Returns the **same** storage instance, allowing for method chaining.

---

### `setOptions(options?: CascadeStorageOptions): void`

Overrides the current internal options with the provided ones (does **not** return a new instance). Useful for on-the-fly changes to the behavior or storage priorities:

```ts
storage.setOptions({ storages: ["memory"], raw: true });
```

---

### `support(storageType: "local" | "cookie" | "session" | "memory"): boolean`

Checks if the specified storage type is **recognized** by basil.js and CascadeStorage.

- Returns `true` if recognized (among `"local"`, `"cookie"`, `"session"`, `"memory"`).
- Returns `false` otherwise (e.g., `"indexedDB"` is not recognized).

```ts
console.log(storage.support("cookie")); // true
console.log(storage.support("indexedDB")); // false
```

---

### `check(storageType: "local" | "cookie" | "session" | "memory"): boolean`

Verifies whether the specified storage type is **actually available** in the current environment.

- For example, `cookie` might be recognized but **disabled** if the user has disabled cookies in their browser.
- Or `local` (localStorage) might be blocked in private mode on some browsers.

```ts
if (storage.check("cookie")) {
  console.log("Cookies are enabled and available!");
} else {
  console.log("Cookies might be disabled or blocked.");
}
```

---

### `set<T>(key: string | number | boolean | null | (string | number | boolean | null)[], value: T, options?: CascadeStorageOptions): boolean`

Sets a value under the specified `key` in **all** configured storages (that pass the `check()` test).

- **Expiration**  
  If `raw` is `false` (the default), CascadeStorage automatically stores the data in a structured form:
  ```js
  { value: <yourValue>, expires: <timestamp> }
  ```
  If `raw` is `true`, no JSON wrapping or metadata is added—the value is stored **exactly** as you provide it.
- **Multiple keys**  
  If you pass an array (e.g., `["user", "name"]`), those keys are joined by `keyDelimiter` (default `"."`).  
  So `["user", "name"]` => `"user.name"`.
- **Return Value**  
  `true` if at least one storage successfully wrote the data, otherwise `false`.

```ts
storage.set("username", "yujiosaka");
storage.set(["user", "name"], "yujiosaka"); // stored under "user.name"
```

**Raw Mode Example**:

```ts
// If 'raw' is enabled, the value is stored verbatim
storage.set("rawData", "Just a raw string", { raw: true });
```

---

### `get<T>(key: string | number | boolean | null | (string | number | boolean | null)[], options?: CascadeStorageOptions): T | null`

Retrieves the value for the specified `key`, checking each configured storage in order until a **non-expired** (and, if not `raw`, a valid JSON-parsed) value is found.

- If `raw` is `false`, the value is assumed to be JSON-wrapped with an expiration timestamp, and will be checked for expiry. Expired data returns `null`.
- If `raw` is `true`, CascadeStorage returns **exactly** the string that was stored (no expiration metadata is applied in raw mode).

```ts
const username = storage.get<string>("username");
if (username) {
  console.log("Found user:", username);
} else {
  console.log("User not found or expired.");
}
```

**Note**:  
If `raw` data was stored initially, make sure to fetch it with `{ raw: true }` so that it’s returned directly as the original string. Otherwise, you may get `null` because the library expects the `{ value, expires }` format.

---

### `remove(key: string | number | boolean | null | (string | number | boolean | null)[], options?: CascadeStorageOptions): void`

Removes the specified `key` from **all** configured storages. Does nothing if the key does not exist.

```ts
storage.remove("username");
```

---

### `reset(options?: CascadeStorageOptions): void`

Clears **all** keys in **all** configured storages. Internally calls basil.js’s `reset()` on each storage in the list.

```ts
storage.reset();
```

---

### `keys(options?: CascadeStorageOptions): string[]`

Returns a **unique** array of valid keys found in the configured storages.

- If `raw` is `false`, expired keys are automatically filtered out.
- If `raw` is `true`, it bypasses expiration checks entirely and returns **all** keys found.

```ts
const keys = storage.keys();
console.log("All known keys:", keys);
```

---

### `keysMap(options?: CascadeStorageOptions): Record<string, Array<"local" | "cookie" | "session" | "memory">>`

Returns an object where each key maps to **an array of storages** that currently have a valid (non-expired) value for that key.

```ts
{
  [key: string]: Array<"local" | "cookie" | "session" | "memory">
}
```

**Example**:

```ts
storage.set("name", "yujiosaka");
// By default, writes to ["local", "cookie", "session", "memory"]

storage.setOptions({ storages: ["local", "memory"] });
storage.set("age", 38);
// Now writes only to ["local", "memory"]

storage.setOptions({ storages: ["session"] });
storage.set("color", "red");
// Now writes only to ["session"]

// Switch back to using all storages
storage.setOptions({ storages: ["local", "cookie", "session", "memory"] });
console.log(storage.keysMap());
/*
{
  "name": ["local", "cookie", "session", "memory"],
  "age": ["local", "memory"],
  "color": ["session"]
}
*/
```

---

## CascadeStorageOptions

The **`CascadeStorageOptions`** interface extends [Basil.js](https://github.com/Wisembly/basil.js)'s options with additional functionality for cascaded writes and uniform expiration.

| Property          | Type                                                  | Default                                    | Description                                                                                                                                                                         |
| ----------------- | ----------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **namespace?**    | `string`                                              | `"c45c4d3-570r463"`                        | A prefix applied to all keys before storing. Helps avoid collisions with keys from other libraries or parts of your app.                                                            |
| **storages?**     | `Array<"local" \| "cookie" \| "session" \| "memory">` | `["local", "cookie", "session", "memory"]` | The list (and order) of storages you want to write to and read from. CascadeStorage will attempt each in turn.                                                                      |
| **expireDays?**   | `number`                                              | `365`                                      | The number of days after which data should expire. Used **only** if `raw` is false. If `raw` is true, no expiration timestamp is attached.                                          |
| **keyDelimiter?** | `string`                                              | `"."`                                      | Delimiter used when passing an array of keys to `set()` or `get()`.                                                                                                                 |
| **raw?**          | `boolean`                                             | `false`                                    | If `true`, data is stored exactly as provided (no JSON parsing, no expiration logic). If you do not want expiration or nested objects, set this to true.                            |
| **(others)**      | Basil.js options like `secure?`, `sameSite?`, etc.    | -                                          | You can also pass other standard Basil.js options; they will be forwarded to the underlying storage engines. For example, passing `secure: true` for cookies, or a custom `domain`. |

> **Important**
>
> - If you set `raw` to `true` globally, **all** calls to `set()` default to raw storage unless you override it per call.
> - The `expireDays` option is **ignored** in raw mode. No timestamp is attached to your data, so it never expires unless the browser itself clears the storage.
> - The best practice is to **avoid** frequently switching between raw and non-raw usage for the **same key**, since you might end up with mixed data formats in your storages.
