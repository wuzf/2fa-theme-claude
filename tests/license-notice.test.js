import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { mount } from "../src/theme.js";
import { hostText, localText } from "../src/i18n.js";
import { createSyntheticSdk } from "../dev/synthetic-sdk.js";

const NOTICE = "Claude for 2FA\nMIT License\n";

function fixture(t, respond = () => Promise.resolve(NOTICE)) {
  const window = new Window({ url: "https://claude.test/" });
  const root = window.document.createElement("div");
  window.document.body.append(root);
  const fetches = [];
  window.fetch = (url) => {
    fetches.push(String(url));
    return Promise.resolve(respond()).then((body) =>
      body instanceof Error
        ? Promise.reject(body)
        : typeof body === "string"
          ? { ok: true, text: async () => body }
          : body,
    );
  };
  const mock = createSyntheticSdk();
  mock.emit();
  const app = mount({
    root,
    sdk: mock.sdk,
    appearance: { settings: { density: "comfortable" } },
  });
  t.after(async () => {
    app.unmount();
    await window.happyDOM.abort();
  });
  const link = root.querySelector('a[href$="licenses/NOTICE.txt"]');
  assert.ok(link, "license link");
  const panel = root.querySelector("#" + link.getAttribute("aria-controls"));
  assert.ok(panel, "license panel");
  const press = (node, init = {}) => {
    const event = new window.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
      ...init,
    });
    node.dispatchEvent(event);
    return event;
  };
  return { window, root, mock, app, link, panel, fetches, press };
}
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

test("the MIT link opens no separate window and starts with its notice closed", (t) => {
  const h = fixture(t);
  assert.equal(h.link.hasAttribute("target"), false);
  assert.equal(h.link.hasAttribute("rel"), false);
  assert.equal(h.link.getAttribute("aria-expanded"), "false");
  assert.equal(h.panel.hidden, true);
  assert.ok(h.root.firstElementChild.contains(h.panel), "inside the theme");
  assert.equal(h.fetches.length, 0);
});

test("a click shows the fetched notice inline, once, and toggles it", async (t) => {
  const h = fixture(t);
  const event = h.press(h.link);
  assert.equal(event.defaultPrevented, true);
  assert.equal(h.panel.hidden, false);
  assert.equal(h.link.getAttribute("aria-expanded"), "true");
  const text = h.panel.querySelector("pre");
  assert.ok(text.textContent.length > 0, "loading text");
  assert.notEqual(text.textContent, NOTICE);
  assert.ok(h.window.document.activeElement === text);
  await flush();
  assert.equal(text.textContent, NOTICE);
  assert.deepEqual(h.fetches, [h.link.href]);

  assert.equal(h.press(h.link).defaultPrevented, true);
  assert.equal(h.panel.hidden, true);
  assert.equal(h.link.getAttribute("aria-expanded"), "false");
  h.press(h.link);
  await flush();
  assert.equal(h.panel.hidden, false);
  assert.equal(text.textContent, NOTICE);
  assert.equal(h.fetches.length, 1);
});

test("the close button and Escape hide the notice and return focus to the link", async (t) => {
  const h = fixture(t);
  h.press(h.link);
  await flush();
  const close = h.panel.querySelector("button");
  assert.equal(close.textContent, hostText(h.mock.sdk, "close", "Close"));
  close.click();
  assert.equal(h.panel.hidden, true);
  assert.equal(h.link.getAttribute("aria-expanded"), "false");
  assert.ok(h.window.document.activeElement === h.link);

  h.press(h.link);
  const text = h.panel.querySelector("pre");
  text.dispatchEvent(
    new h.window.KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
  assert.equal(h.panel.hidden, true);
  assert.ok(h.window.document.activeElement === h.link);
});

test("modified clicks keep the browser's own link behavior", (t) => {
  const h = fixture(t);
  for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }])
    assert.equal(h.press(h.link, init).defaultPrevented, false);
  assert.equal(h.panel.hidden, true);
  assert.equal(h.fetches.length, 0);
});

test("a failed fetch shows the failure text and the next opening retries", async (t) => {
  let fail = true;
  const h = fixture(t, () =>
    fail ? { ok: false, status: 404, text: async () => "missing" } : NOTICE,
  );
  h.press(h.link);
  await flush();
  const text = h.panel.querySelector("pre");
  assert.equal(text.textContent, localText("en", "failed"));
  h.press(h.link);
  fail = false;
  h.press(h.link);
  await flush();
  assert.equal(text.textContent, NOTICE);
  assert.equal(h.fetches.length, 2);

  const rejected = fixture(t, () => new Error("offline"));
  rejected.press(rejected.link);
  await flush();
  assert.equal(
    rejected.panel.querySelector("pre").textContent,
    localText("en", "failed"),
  );
});

test("a fetch finishing after unmount writes nothing", async (t) => {
  let finish;
  const h = fixture(t, () => new Promise((resolve) => (finish = resolve)));
  h.press(h.link);
  await flush();
  const text = h.panel.querySelector("pre");
  const loading = text.textContent;
  h.app.unmount();
  finish(NOTICE);
  await flush();
  assert.equal(text.textContent, loading);
});
