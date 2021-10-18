import LRU from "lru-cache";
import fetch from "node-fetch";
import * as https from "https";
import { Meta } from "./types";

const _5MIN = 5 * 60 * 1000;
const _15MIN = 15 * 60 * 1000;
const _1H = 60 * 60 * 1000;

const current_year = new Date().getFullYear();

function computeFreshness(
  { meta: { modified, versions }, timestamp },
  requestedVersion
) {
  let shouldRefresh, returnStale;
  const elapsed = Date.now() - timestamp;
  const modifiedYear = parseInt(modified.slice(0, 4));
  if (
    elapsed < _5MIN ||
    (modifiedYear < current_year && elapsed < _1H) ||
    requestedVersion === "$EXISTS$" ||
    (requestedVersion && requestedVersion in versions)
  ) {
    shouldRefresh = false;
    returnStale = true;
  } else if (
    (modifiedYear < current_year || elapsed < _15MIN) &&
    !requestedVersion
  ) {
    shouldRefresh = true;
    returnStale = true;
  } else {
    shouldRefresh = true;
    returnStale = false;
  }
  return { shouldRefresh, returnStale };
}

export class Cache {
  agent: https.Agent
  cache: LRU
  logger: typeof console
  fallback?: (id: string) => Meta
  registry: string;

  constructor({
    maxSockets = 5,
    cacheSize = 10 * 1024,
    logger = console,
    registry = 'registry.npmjs.org',
    fallback,
  }: {
    maxSockets?: number,
    cacheSize?: number,
    logger?: typeof console,
    registry?: string,
    fallback?: (id: string)=> Meta
  } = {}) {
    this.agent = new https.Agent({
      maxSockets,
    });
    /** @type {LRU<string, any>} */
    this.cache = new LRU({
      max: cacheSize,
    });
    this.logger = logger;
    this.fallback = fallback;
    this.registry = registry;
  }

  async exists(qualified) {
    return this.getMeta(qualified, "$EXISTS$").then(({ error }) => !error);
  }

  /**
   * @param qualified {string}
   * @returns {Promise<any>}
   */
  async getMeta(qualified, requestedVersion) {
    const refreshMeta = async (etag?: string) => {
      const headers = {
        Accept: "application/vnd.npm.install-v1+json",
      };
      if (etag) {
        headers["if-none-match"] = etag;
      }
      const response = await fetch(`https://${this.registry}/${qualified}`, {
        headers,
        agent: this.agent,
      });
      this.logger.debug(`Received ${response.status}`);
      if (etag && response.status === 304) return null; // not modified
      let meta: Meta = <any>await response.json();
      if ('error' in meta) {
        if (this.fallback) {
          meta = await this.fallback(qualified);
        }
        if ('error' in meta) {
          meta.modified = new Date().toISOString();
          this.logger.warn(
            `Error fetching metadata for npm package ${qualified}: ${meta.error}`
          );
        }
      }
      if (meta.versions) {
        for (const v of <any>Object.values(meta.versions)) {
          // saves some memory & cache size
          if (v.dist) {
            v.dist = { tarball: v.dist.tarball }
          }
          delete v.engines;
          delete v.name;
          delete v.version;
        }
      }
      return {
        meta,
        etag: response.headers.get("etag"),
        timestamp: Date.now(),
      };
    };
    const cached$ = this.cache.get(qualified);
    if (cached$) {
      const cached = await cached$;
      const { shouldRefresh, returnStale } = computeFreshness(
        cached,
        requestedVersion
      );
      let meta$;
      if (shouldRefresh) {
        cached.timestamp = Date.now(); // prevent simultaneous refreshes
        meta$ = refreshMeta(cached.etag)
          .then((m) => {
            if (m !== null) {
              this.cache.set(qualified, m);
              return m.meta;
            }
            return cached.meta;
          })
          .catch((e) => {
            this.logger.warn("Failed to refresh meta", e);
            // if npm registry fetch fails and we have a cached meta, use it
            return cached.meta;
          });
      }
      return returnStale ? cached.meta : meta$;
    } else {
      const refresh$ = refreshMeta();
      this.cache.set(qualified, refresh$);
      return refresh$.then((m) => m.meta);
    }
  }

  async export() {
    const data = {};
    await Promise.all(
      this.cache
        .keys()
        .map((k) => [k, this.cache.get(k)])
        .map(async ([k, v$]) => (data[k] = await v$))
    );
    return data;
  }

  import(data) {
    Object.entries(data).forEach(([k, v]) => this.cache.set(k, v));
  }
}
