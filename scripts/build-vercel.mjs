// Bundles the API into one Vercel serverless function using the Build Output API (the same layout
// Nuxt/Nitro writes for Vercel): .vercel/output/{config.json, static/, functions/__api.func/}.
// Run by Vercel as the build command (see vercel.json); run it locally with `npm run build:vercel` to check.
import { build } from "esbuild";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".vercel", "output");
const fn = join(out, "functions", "__api.func");

// A watcher (or an editor) can hold the folder open on Windows; then just overwrite the files below.
try {
  rmSync(out, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
} catch {
  console.warn(`Could not clear ${out}; overwriting its files instead.`);
}
mkdirSync(fn, { recursive: true });
mkdirSync(join(out, "static"), { recursive: true });

const result = await build({
  entryPoints: [join(root, "src", "vercel.ts")],
  outfile: join(fn, "index.js"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  sourcemap: false,
  minify: false,
  logLevel: "info",
  tsconfig: join(root, "tsconfig.json"),
  // `export default app` becomes module.exports, which is what the Node launcher calls.
  footer: { js: "module.exports = module.exports.default;" },
  // The native libSQL driver is only used for local files, never on Vercel (which uses the HTTP client).
  external: ["libsql"],
  metafile: true,
});

writeFileSync(
  join(fn, ".vc-config.json"),
  JSON.stringify({ runtime: "nodejs22.x", handler: "index.js", launcherType: "Nodejs", shouldAddHelpers: false, supportsResponseStreaming: true }, null, 2),
);
// The bundle is CommonJS; say so, whatever package.json sits above it.
writeFileSync(join(fn, "package.json"), JSON.stringify({ type: "commonjs" }));
writeFileSync(
  join(out, "config.json"),
  JSON.stringify({ version: 3, routes: [{ src: "/(.*)", dest: "/__api" }] }, null, 2),
);

const kb = Math.round(Object.values(result.metafile.outputs)[0].bytes / 1024);
console.info(`Vercel function written to ${fn} (${kb} KB)`);
