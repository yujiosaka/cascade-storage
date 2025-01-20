import { afterEach, beforeEach, describe, expect, it, setSystemTime } from "bun:test";
import { addDays } from "date-fns";
import CascadeStorage from "../src";

describe("CascadeStorage", () => {
  let storage: CascadeStorage;

  beforeEach(() => {
    storage = new CascadeStorage({ storages: ["local", "session", "memory"] });
    storage.reset();
  });

  afterEach(() => {
    setSystemTime();
    storage.reset();
  });

  describe("constructor", () => {
    it("creates an instance", () => {
      expect(storage).toBeInstanceOf(CascadeStorage);
      expect(storage.options.storages).toEqual(["local", "session", "memory"]);
    });

    it("creates an instance with default storages", () => {
      storage = new CascadeStorage();

      expect(storage).toBeInstanceOf(CascadeStorage);
      expect(storage.options.storages).toEqual(["local", "cookie", "session", "memory"]);
    });
  });

  describe("init", () => {
    it("updates internal options and return the instance", () => {
      storage = storage.init({ storages: ["memory"] });
      storage.set("name", "yujiosaka");

      expect(storage).toBeInstanceOf(CascadeStorage);
      expect(storage.keysMap()).toEqual({ name: ["memory"] });
    });
  });

  describe("setOptions", () => {
    it("overrides existing options", () => {
      storage.setOptions({ storages: ["memory"] });
      storage.set("name", "yujiosaka");

      expect(storage.keysMap()).toEqual({ name: ["memory"] });
    });
  });

  describe("check", () => {
    it("returns true for all storages", () => {
      storage = new CascadeStorage();

      expect(storage.check("local")).toBe(true);
      expect(storage.check("cookie")).toBe(true);
      expect(storage.check("session")).toBe(true);
      expect(storage.check("memory")).toBe(true);
    });
  });

  describe("support", () => {
    it("returns true for all storages", () => {
      expect(storage.support("local")).toBe(true);
      expect(storage.support("cookie")).toBe(true);
      expect(storage.support("session")).toBe(true);
      expect(storage.support("memory")).toBe(true);
    });
  });

  describe("set", () => {
    it("sets a string value", () => {
      const result = storage.set("name", "yujiosaka");
      const keysMap = storage.keysMap();

      expect(result).toBe(true);
      expect(keysMap).toEqual({ name: ["local", "session", "memory"] });
    });

    it("sets a string value with multiple keys", () => {
      const result = storage.set(["user", "name"], "yujiosaka");
      const keysMap = storage.keysMap();

      expect(result).toBe(true);
      expect(keysMap).toEqual({ "user.name": ["local", "session", "memory"] });
    });

    it("sets a number value", () => {
      const result = storage.set("age", 38);
      const keysMap = storage.keysMap();

      expect(result).toBe(true);
      expect(keysMap).toEqual({ age: ["local", "session", "memory"] });
    });

    it("sets a JSON value", () => {
      const user = { name: "yujiosaka", age: 38 };
      const result = storage.set("user", user);
      const keysMap = storage.keysMap();

      expect(result).toBe(true);
      expect(keysMap).toEqual({ user: ["local", "session", "memory"] });
    });

    it("sets a null value", () => {
      const result = storage.set("name", null);
      const keysMap = storage.keysMap();

      expect(result).toBe(true);
      expect(keysMap).toEqual({});
    });
  });

  describe("get", () => {
    it("gets a string value", () => {
      storage.set("name", "yujiosaka");

      expect(storage.get<string>("name")).toBe("yujiosaka");
    });

    it("gets a string value with multiple keys", () => {
      storage.set(["user", "name"], "yujiosaka");

      expect(storage.get<string>("user.name")).toBe("yujiosaka");
    });

    it("gets a number value", () => {
      storage.set("age", 38);

      expect(storage.get<number>("age")).toBe(38);
    });

    it("gets a JSON value", () => {
      const user = { name: "yujiosaka", age: 38 };
      storage.set("user", user);

      expect(storage.get<typeof user>("user")).toEqual({ name: "yujiosaka", age: 38 });
    });

    it("gets a null value", () => {
      storage.set("name", null);

      expect(storage.get<string>("name")).toBeNull();
    });

    it("does not get an expired value", () => {
      const result = storage.set("name", "yujiosaka");

      setSystemTime(addDays(new Date(), 366));

      expect(result).toBe(true);
      expect(storage.get<string>("name")).toBeNull();
    });

    it("returns null for keys that do not exist", () => {
      expect(storage.get("non-existent-key")).toBeNull();
    });

    describe("when raw value is set", () => {
      it("gets raw value exactly as provided", () => {
        storage.set("name", "yujiosaka", { raw: true });

        const result = storage.get("name", { raw: true });
        expect(result).toBe("yujiosaka");
      });

      it("fails to get value without raw", () => {
        storage.set("name", "yujiosaka", { raw: true });

        const result = storage.get("name");
        expect(result).toBeNull();
      });

      it("does not parse JSON value without raw", () => {
        storage.set("user", JSON.stringify({ name: "yujiosaka", age: 38 }), { raw: true });

        const result = storage.get("user", { raw: true });
        expect(result).toBe('{"name":"yujiosaka","age":38}');
      });

      it("ignores expiration logic", () => {
        storage.set("name", "yujiosaka", { raw: true });

        setSystemTime(addDays(new Date(), 366));

        const result = storage.get("name", { raw: true });
        expect(result).toBe("yujiosaka");
      });
    });
  });

  describe("remove", () => {
    it("removes the specified key", () => {
      storage.set("name", "yujiosaka");
      expect(storage.get<string>("name")).toBe("yujiosaka");

      storage.remove("name");
      expect(storage.get<string>("name")).toBeNull();
      expect(storage.keysMap()).toEqual({});
    });

    it("does not throw when the key does not exist", () => {
      expect(() => void storage.remove("non-existent-key")).not.toThrow();
    });
  });

  describe("reset", () => {
    it("resets all keys from each storage in the list", () => {
      storage.set("name", "yujiosaka");
      storage.set("age", "38");

      expect(storage.keysMap()).toEqual({ name: ["local", "session", "memory"], age: ["local", "session", "memory"] });

      storage.reset();

      expect(storage.get<string>("name")).toBeNull();
      expect(storage.get<number>("age")).toBeNull();
      expect(storage.keysMap()).toEqual({});
    });
  });

  describe("keys", () => {
    it("returns a unique array of keys", () => {
      storage.set("name", "yujiosaka");
      storage.set("age", 38);

      const keys = storage.keys().sort();
      expect(keys).toEqual(["name", "age"].sort());
    });

    it("returns empty array when nothing is stored", () => {
      expect(storage.keys()).toEqual([]);
    });

    it("skips expired keys", () => {
      storage.set("name", "yujiosaka");

      setSystemTime(addDays(new Date(), 366));

      expect(storage.keys()).toEqual([]);
    });

    describe("when raw value is set", () => {
      it("ignores expiration logic", () => {
        storage.set("name", "yujiosaka", { raw: true });

        setSystemTime(addDays(new Date(), 366));

        const result = storage.keys({ raw: true });
        expect(result).toEqual(["name"]);
      });
    });
  });

  describe("keysMap", () => {
    it("returns a key map", () => {
      storage.set("name", "yujiosaka");

      storage.setOptions({ storages: ["local", "memory"] });
      storage.set("age", 38);

      const user = { name: "yujiosaka", age: 38 };

      storage.setOptions({ storages: ["session"] });
      storage.set("user", user);

      storage.setOptions({ storages: ["local", "session", "memory"] });
      const keysMap = storage.keysMap();

      expect(keysMap).toEqual({
        name: ["local", "session", "memory"],
        age: ["local", "memory"],
        user: ["session"],
      });
    });

    it("skips expired keys", () => {
      storage.set("name", "yujiosaka");

      setSystemTime(addDays(new Date(), 366));

      const keysMap = storage.keysMap();
      expect(keysMap).toEqual({});
    });

    describe("when raw value is set", () => {
      it("ignores expiration logic", () => {
        storage.set("name", "yujiosaka", { raw: true });

        setSystemTime(addDays(new Date(), 366));

        const result = storage.keysMap({ raw: true });
        expect(result).toEqual({ name: ["local", "session", "memory"] });
      });
    });
  });
});
