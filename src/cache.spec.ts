import { Cache } from "./cache.js";
import assert from "assert";

describe("cache", () => {
  it("react should exist", async () => {
    const cache = new Cache();
    assert.strictEqual(await cache.exists("react"), true);
    assert.strictEqual(await cache.exists("react"), true);
  });
  it("shimibilik should not exist", async () => {
    const cache = new Cache();
    assert.strictEqual(await cache.exists("shimibilik"), false);
    assert.strictEqual(await cache.exists("shimibilik"), false);
  });
  it("shimibilik with fallback should exist", async () => {
    const cache = new Cache({
      // @ts-ignore
      fallback: (id) => {
        if (id === "shimibilik") return { versions: { "1.0.0": {} }, modified: new Date().toISOString() };
        assert.fail('not ok')
      },
    });
    assert.strictEqual(await cache.exists("shimibilik"), true);
    assert.strictEqual(await cache.exists("shimibilik"), true);
  });
  it("cache import/export", async () => {
    let cache = new Cache({
      // @ts-ignore
      fallback: (id) => {
        if (id === "shimibilik") return { versions: { "1.0.0": {} }, modified: new Date().toISOString() };
        assert.fail('not ok')
      },
    });
    await cache.exists("shimibilik");
    const data = await cache.export();
    cache = new Cache();
    cache.import(data);
    assert.strictEqual(await cache.exists("shimibilik"), true);
    assert.strictEqual(await cache.exists("shimibilik"), true);
  });
});
