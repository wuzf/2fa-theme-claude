import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { unzipSync } from "fflate";
import { createPublicAppearance } from "../scripts/publicAppearance.js";
import { hostAppearance } from "../src/hostAppearance.js";
import { theme } from "../theme.config.js";

const buildScript = fileURLToPath(
  new URL("../scripts/build.js", import.meta.url),
);
const output = await mkdtemp(join(tmpdir(), "claude-package-"));
after(() => rm(output, { recursive: true, force: true }));
const archivePath = join(output, "2fa-theme.zip");
const build = () =>
  execFileSync(process.execPath, [buildScript, "--out-dir", output], {
    stdio: "pipe",
  });
build();

test("release contains exact inventory, complete notices and no development shell or external assets", async () => {
  const archive = unzipSync(new Uint8Array(await readFile(archivePath)));
  const manifest = JSON.parse(
    new TextDecoder().decode(archive["2fa-theme.json"]),
  );
  assert.equal(manifest.themeApiVersion, 2);
  assert.equal(manifest.kind, "app");
  assert.equal(manifest.sdkApiVersion, 1);
  assert.equal(manifest.id, "claude-for-2fa");
  assert.equal(manifest.version, "1.0.0");
  const publicFile = manifest.files.find(
    ({ path }) => path === "public-appearance.json",
  );
  assert.equal(publicFile?.mime, "application/json");
  assert.ok(publicFile.size <= 128 * 1024);
  assert.deepEqual(
    JSON.parse(new TextDecoder().decode(archive[publicFile.path])),
    createPublicAppearance(),
  );
  assert.equal(Object.keys(archive).length, manifest.files.length + 1);
  for (const file of manifest.files) {
    assert.ok(archive[file.path]);
    assert.equal(archive[file.path].length, file.size);
    assert.equal(
      createHash("sha256").update(archive[file.path]).digest("hex"),
      file.sha256,
    );
  }
  assert.ok(
    !Object.keys(archive).some(
      (path) =>
        path.startsWith("dev/") ||
        path.startsWith("assets/") ||
        path.endsWith(".html"),
    ),
  );
  for (const name of ["Pixel-adapter-MIT", "Claude-MIT", "NOTICE"])
    assert.ok(archive[`licenses/${name}.txt`]);
});

test("release rebuild is byte-for-byte reproducible and preserves the adapter license", async () => {
  const before = await readFile(archivePath);
  build();
  const after = await readFile(archivePath);
  assert.deepEqual(after, before);
  const archive = unzipSync(new Uint8Array(after));
  assert.deepEqual(
    Buffer.from(archive["licenses/Pixel-adapter-MIT.txt"]),
    await readFile(
      new URL("../licenses/Pixel-adapter-MIT.txt", import.meta.url),
    ),
  );
});

const hostIntegration = process.env.HOST_ROOT ? test : test.skip;
hostIntegration(
  "real host validates the package and resolves public colors without loading theme assets",
  async () => {
    const { normalizeAppThemeImport, normalizeAppAppearance } = await import(
      pathToFileURL(resolve(process.env.HOST_ROOT, "src/themes/appPackage.js"))
        .href
    );
    const { resolvePublicAppearance } = await import(
      pathToFileURL(
        resolve(process.env.HOST_ROOT, "src/themes/publicAppearance.js"),
      ).href
    );
    const pkg = await normalizeAppThemeImport({
      bytes: new Uint8Array(await readFile(archivePath)),
    });
    assert.deepEqual(pkg.publicAppearanceDescriptor, createPublicAppearance());
    const combinations = theme.settings.reduce(
      (current, field) =>
        current.flatMap((settings) =>
          (field.type === "boolean"
            ? [false, true]
            : field.options.map(({ value }) => value)
          ).map((value) => ({ ...settings, [field.key]: value })),
        ),
      [{}],
    );
    for (const settings of combinations) {
      const result = resolvePublicAppearance(pkg, settings);
      assert.deepEqual(
        Object.keys(result).sort(),
        ["formatVersion", "packageId", "light", "dark", "fonts"].sort(),
      );
      assert.deepEqual(result.light, hostAppearance(settings, false));
      assert.deepEqual(result.dark, hostAppearance(settings, true));
      assert.deepEqual(result.fonts, []);
      const normalized = await normalizeAppAppearance(pkg, {
        settings,
      });
      assert.deepEqual(normalized.appearance.publicAppearance, result);
      assert.deepEqual(
        resolvePublicAppearance(pkg, settings, {
          baseUrl: "/theme-preview/" + "a".repeat(64) + "/",
        }),
        result,
      );
    }
  },
);
