import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Window } from "happy-dom";
import { mount } from "../src/theme.js";
import { createSyntheticSdk } from "../dev/synthetic-sdk.js";

function fixture(t) {
  const window = new Window({ url: "https://localized-labels.test/" });
  const root = window.document.createElement("div");
  window.document.body.append(root);
  const mock = createSyntheticSdk();
  const app = mount({
    root,
    sdk: mock.sdk,
    appearance: { settings: {} },
  });
  t.after(async () => {
    app.unmount();
    await window.happyDOM.abort();
  });
  return { window, root, mock };
}
const flush = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};

test("search placeholder and HOTP counter follow the interface language", async (t) => {
  const h = fixture(t);
  const search = () => h.root.querySelector('input[type="search"]');
  const counter = () =>
    h.root.querySelector('article[data-account="hotp"] .claude-expiry-label')
      .firstElementChild.textContent;
  for (const [language, placeholder, counterLabel] of [
    ["en", "Search service or account", "Counter"],
    ["zh-CN", "搜索服务或账户名称", "计数器"],
    ["zh-TW", "搜尋服務或帳號名稱", "計數器"],
    ["ja", "サービスまたはアカウントを検索", "カウンター"],
    ["de", "Dienst oder Konto suchen", "Zähler"],
  ]) {
    h.mock.state.preferences.resolvedLanguage = language;
    h.mock.emit();
    await flush();
    assert.equal(search().placeholder, placeholder);
    assert.equal(counter(), counterLabel);
  }
});

test("the HOTP counter keeps a gap between its label and value", (t) => {
  const h = fixture(t);
  for (const file of ["tokens", "components", "application", "reading-room"]) {
    const style = h.window.document.createElement("style");
    style.textContent = readFileSync(
      new URL(`../src/styles/${file}.css`, import.meta.url),
      "utf8",
    );
    h.window.document.head.append(style);
  }
  const label = h.root.querySelector(
    'article[data-account="hotp"] .claude-expiry-label',
  );
  const style = h.window.getComputedStyle(label);
  assert.equal(style.display, "inline-flex");
  assert.notEqual(style.columnGap, "normal");
  assert.notEqual(style.columnGap, "0px");
});
