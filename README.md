# cascade-storage [![npm version](https://badge.fury.io/js/cascade-storage.svg)](https://badge.fury.io/js/cascade-storage) [![CI/CD](https://github.com/yujiosaka/cascade-storage/actions/workflows/ci_cd.yml/badge.svg)](https://github.com/yujiosaka/cascade-storage/actions/workflows/ci_cd.yml)

###### [API](https://github.com/yujiosaka/cascade-storage/blob/main/docs/API.md) | [Contributing](https://github.com/yujiosaka/cascade-storage/blob/main/docs/CONTRIBUTING.md) | [Changelog](https://github.com/yujiosaka/cascade-storage/blob/main/docs/CHANGELOG.md)

**cascade-storage** provides a cascade/fallback mechanism among multiple storages (localStorage, cookie, sessionStorage, and in-memory storage) and ensures consistent expiration behavior across all these storages.

## 🌟 Features

- **Cascade writes**: Write data to multiple storages in one go.  
  This ensures high availability for your data if one storage (like cookies) is cleared or becomes invalid.
- **Fallback reads**: Read data from the first storage that has valid (i.e., non-expired) data.  
  Greatly reduces the risk of data loss.
- **Uniform expiration**: Even for storages without native expiration (like localStorage, sessionStorage, or memory), the expiration is enforced by storing timestamps internally.
- **Partial drop-in replacement**: Built on top of [Basil.js](https://github.com/Wisembly/basil.js), so most concepts (like `storages` array, `namespace`, etc.) will be familiar.

### Motivation

1. **Equip Basil.js with a fallback mechanism**  
   [Basil.js](https://github.com/Wisembly/basil.js) already supports a list of storages but only writes to the first available storage. This project extends that functionality by writing the data to **all** configured storages simultaneously and reading from any available storage in a prioritized order.
   Why? Because being “available” at one time does not guarantee continued availability—e.g., cookies can be silently deleted by browsers, or localStorage could be restricted by domain or protocol changes. CascadeStorage ensures that even if one storage becomes unavailable, data can still be retrieved from another.

2. **Ensure consistent `expireDays` behavior**  
   By default, localStorage, sessionStorage, and in-memory storage do not support max-age or an expiration property like cookies do. CascadeStorage stores an expiration timestamp along with the data so that **all** storages respect the same expiration logic. Expired data is ignored and automatically removed upon retrieval.

### Comparison with Basil.js

|                       | **[Basil.js](https://github.com/Wisembly/basil.js)**                                                                | **[CascadeStorage](https://github.com/yujiosaka/cascade-storage)**                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fallback strategy** | Uses the **first** available storage from the `storages` list and falls back only if that storage is not supported. | Writes data to **all** storages in the list (if supported) and reads from the first valid data it finds.                                         |
| **Expiration**        | Only cookies have an expiration (if specified). Other storages do not.                                              | All storages (local, cookie, session, memory) are treated equally with a consistent expiration check. Expired data is automatically invalidated. |
| **Data availability** | Data only ends up in the first available storage. If that storage is unavailable later, the data is lost.           | Data is written to every configured storage. If one becomes unavailable, it can be retrieved from another.                                       |

## 🚀 Getting Started

### Installation

```bash
npm install cascade-storage
```

### Basic Usage

```ts
import CascadeStorage from "cascade-storage";

// Instantiate with default options
const storage = new CascadeStorage();

// Set a value
storage.set("username", "yujiosaka");

// Get a value
console.log(storage.get("username")); // "yujiosaka"

// Remove a value
storage.remove("username");
```

By default, the following storages are used (in order):

```
["local", "cookie", "session", "memory"]
```

If a storage is not supported by the current environment (e.g. localStorage in Node.js), it will be skipped. CascadeStorage will attempt to write to all remaining storages.

## 🧑‍💻️ API reference

See [here](https://github.com/yujiosaka/cascade-storage/blob/main/docs/API.md) for the API reference.

## 💻 Testing

CascadeStorage includes a series of [Bun](https://bun.sh/) tests verifying functionality.

```bash
bun test
```

## 💳 License

This project is licensed under the MIT License. See [LICENSE](https://github.com/yujiosaka/cascade-storage/blob/main/LICENSE) for details.
