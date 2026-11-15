import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { readFile } from "node:fs/promises";
import { mount } from "../src/theme.js";
import { createSyntheticSdk } from "../dev/synthetic-sdk.js";

async function fixture(t, { settings = {}, width = 1440 } = {}) {
  const window = new Window({
    url: "https://claude.test/",
    width,
    height: 900,
  });
  for (const path of ["tokens", "components", "application", "reading-room"]) {
    const style = window.document.createElement("style");
    style.textContent = await readFile(
      new URL(`../src/styles/${path}.css`, import.meta.url),
      "utf8",
    );
    window.document.head.append(style);
  }
  const root = window.document.createElement("div");
  window.document.body.append(root);
  const mock = createSyntheticSdk();
  mock.emit();
  const app = mount({ root, sdk: mock.sdk, appearance: { settings } });
  t.after(async () => {
    app.unmount();
    await window.happyDOM.abort();
  });
  const style = (selector) =>
    window.getComputedStyle(root.querySelector(selector));
  return { window, root, style };
}

test("compact entries keep the reading column and only lose air", async (t) => {
  const comfortable = await fixture(t, {
    settings: { density: "comfortable" },
  });
  const compact = await fixture(t, { settings: { density: "compact" } });
  const card = (h) => h.style(".claude-card");
  // The entry stays a full-width ruled line: no side padding in either density.
  assert.equal(card(compact).paddingLeft, "0px");
  assert.equal(card(compact).paddingRight, "0px");
  assert.ok(
    parseFloat(card(compact).paddingTop) <
      parseFloat(card(comfortable).paddingTop),
  );
  assert.ok(
    parseFloat(compact.style(".claude-copy-code").minHeight) <
      parseFloat(comfortable.style(".claude-copy-code").minHeight),
  );
  assert.equal(card(comfortable).paddingTop, "20px");
});

test("the seconds left are readable at a glance", async (t) => {
  const h = await fixture(t);
  assert.equal(h.style(".claude-expiry-label").fontSize, "13px");
  // Outside the last seconds, which turn amber.
  h.root.querySelector(".claude-expiry").dataset.expiring = "false";
  const strong = h.root.querySelector(".claude-expiry-label strong");
  assert.equal(
    h.window.getComputedStyle(strong).color,
    h.window.getComputedStyle(h.root.querySelector(".claude-theme")).color,
  );
});

test("view is outlined and sized to its label", async (t) => {
  const h = await fixture(t);
  const view = h.style('.claude-toolbar [data-action="display"]');
  assert.notEqual(view.borderTopStyle, "none");
  assert.equal(view.justifySelf, "end");
});

test("on narrow screens only the search row stays pinned", async (t) => {
  const h = await fixture(t, { width: 412 });
  const bar = h.style(".claude-topbar");
  assert.equal(bar.position, "sticky");
  assert.ok(parseFloat(bar.top) < 0);
  assert.equal(
    h.style(".claude-topbar-inner").gridTemplateAreas.replace(/\s+/g, " "),
    '"brand actions" "services services" "search search"',
  );
  const desktop = await fixture(t, { width: 1440 });
  assert.equal(desktop.style(".claude-topbar").top, "0px");
});
