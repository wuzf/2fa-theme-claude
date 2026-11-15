import { test } from "node:test";
import assert from "node:assert/strict";
import { createPublicAppearance } from "../scripts/publicAppearance.js";
import { hostAppearance } from "../src/hostAppearance.js";
import { theme } from "../theme.config.js";

const description = createPublicAppearance();
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

test("public pages retain the runtime palette across all density and heading settings", () => {
  for (const settings of combinations) {
    assert.deepEqual(description.light, hostAppearance(settings, false));
    assert.deepEqual(description.dark, hostAppearance(settings, true));
  }
  assert.equal(description.formatVersion, 1);
  assert.deepEqual(description.fonts, []);
  assert.deepEqual(description.variants, []);
  assert.ok(Buffer.byteLength(JSON.stringify(description)) < 128 * 1024);
});

function luminance(hex) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((part) => parseInt(part, 16) / 255);
  const linear = rgb.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("public text, selected labels and action fills meet normal-text contrast in both schemes", () => {
  for (const mode of ["light", "dark"]) {
    const palette = description[mode];
    for (const [foreground, background] of [
      ["text", "surface"],
      ["text", "subtle"],
      ["muted", "surface"],
      ["muted", "subtle"],
      ["accent", "surface"],
      ["accent", "selected"],
      ["accentText", "accent"],
      ["dangerText", "dangerFill"],
      ["danger", "dangerBackground"],
      ["warning", "warningBackground"],
      ["success", "successBackground"],
    ])
      assert.ok(
        contrast(palette[foreground], palette[background]) >= 4.5,
        `${mode}: ${foreground} on ${background}`,
      );
  }
});
