import semver = require("semver");
import { Meta } from "./types";

/** @returns {string|undefined} */
export function resolveContraints(meta: Meta, constraints: string[]) {
  if ("error" in meta) throw new Error("Invalid meta: " + meta.error);
  for (const c of constraints) {
    if (c in meta.versions) {
      // TODO verify against other constraints ?
      return c;
    }
    if (c in meta["dist-tags"]) {
      // TODO verify against other constraints ?
      return meta["dist-tags"][c];
    }
  }
  if (constraints.every((c) => c === "")) {
    return meta["dist-tags"].latest;
  }
  const sortedVersions = semver.rsort(Object.keys(meta.versions));
  for (const v of sortedVersions) {
    if (constraints.every((c) => semver.satisfies(v, c))) {
      return v;
    }
  }
  return undefined;
}
