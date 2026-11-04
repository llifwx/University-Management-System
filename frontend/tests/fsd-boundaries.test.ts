import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const LAYERS = ["shared", "entities", "features", "widgets", "pages", "app"];
const IMPORT = /(?:from\s+|import\s*\(|import\s+)["']@\/([^"']+)["']/g;

/** Returns why `importer` (path relative to src/) may not import `target` (specifier after "@/"), if so. */
function violation(importer: string, target: string): string | null {
  const [fromLayer, fromSlice] = importer.split("/");
  const [toLayer, toSlice, ...rest] = target.split("/");
  const fromRank = LAYERS.indexOf(fromLayer);
  const toRank = LAYERS.indexOf(toLayer);
  if (toRank === -1) return `unknown layer ${toLayer}`;
  if (toRank > fromRank) return `${fromLayer} may not import ${toLayer}`;
  if (toLayer === "shared" || toLayer === "app") return null; // Segments, not slices.
  if (fromLayer === toLayer && fromSlice !== toSlice) return `cross-slice import within ${toLayer}`;
  if (fromLayer !== toLayer && rest.length > 0 && rest.join("/") !== "server") return `bypasses the public API of ${toLayer}/${toSlice}`;
  return null;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const importsOf = (file: string) => [...readFileSync(file, "utf8").matchAll(IMPORT)].map((match) => match[1]);

describe("Feature-Sliced Design boundaries", () => {
  it("detects each kind of violation", () => {
    expect(violation("entities/course/x.ts", "features/logout")).toMatch(/may not import/);
    expect(violation("features/logout/x.ts", "features/manage-course")).toMatch(/cross-slice/);
    expect(violation("widgets/a/x.ts", "entities/course/model/types")).toMatch(/public API/);
    expect(violation("pages/a/x.ts", "entities/user/server")).toBeNull();
    expect(violation("features/a/x.ts", "shared/ui/button")).toBeNull();
  });

  it("holds across src/", () => {
    const root = path.resolve(__dirname, "../src");
    const problems = sourceFiles(root).flatMap((file) => {
      const relative = path.relative(root, file).replaceAll(path.sep, "/");
      return importsOf(file).flatMap((target) => {
        const problem = violation(relative, target);
        return problem ? [`${relative} -> ${target}: ${problem}`] : [];
      });
    });
    expect(problems).toEqual([]);
  });

  it("keeps Next.js routes on public APIs", () => {
    const routes = sourceFiles(path.resolve(__dirname, "../app"));
    const problems = routes.flatMap((file) => importsOf(file).flatMap((target) => (violation("app/_/x.ts", target) ? [`${file} -> ${target}`] : [])));
    expect(problems).toEqual([]);
  });

  it("leaves root pages/ free of routes", () => {
    expect(readdirSync(path.resolve(__dirname, "../pages"))).toEqual(["README.md"]);
  });
});
