import { Cache } from "./cache";
import * as assert from "assert";

describe("cache", () => {
  it("react should exist", async () => {
    const cache = new Cache();
    assert.strictEqual(await cache.exists("react"), true);
    assert.strictEqual(cache.fetchCount, 1);
    assert.strictEqual(await cache.exists("react"), true);
    assert.strictEqual(cache.fetchCount, 1);
  });
  it("shimibilik should not exist", async () => {
    const cache = new Cache();
    assert.strictEqual(await cache.exists("shimibilik"), false);
    assert.strictEqual(cache.fetchCount, 1);
    assert.strictEqual(await cache.exists("shimibilik"), false);
    assert.strictEqual(cache.fetchCount, 1);
  });
  it("cache import/export", async () => {
    let cache = new Cache();
    assert.strictEqual(await cache.exists("react"), true);
    assert.strictEqual(cache.fetchCount, 1);
    const data = await cache.export();
    cache = new Cache();
    cache.import(data);
    assert.strictEqual(await cache.exists("react"), true);
    assert.strictEqual(cache.fetchCount, 0);
  });
});
