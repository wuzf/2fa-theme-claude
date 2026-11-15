import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { readFile } from "node:fs/promises";
import { mount } from "../src/theme.js";
import { hostAppearance } from "../src/hostAppearance.js";
import { localText, languages } from "../src/i18n.js";
import { createSyntheticSdk } from "../dev/synthetic-sdk.js";

function fixture(t, setup = () => {}) {
  const window = new Window({ url: "https://claude.test/" });
  const root = window.document.createElement("div");
  window.document.body.append(root);
  const mock = createSyntheticSdk();
  setup(mock);
  mock.emit();
  const app = mount({ root, sdk: mock.sdk, appearance: { settings: {} } });
  const select = (key, value) => {
    const control = root.querySelector(`[data-setting="${key}"]`);
    control.value = value;
    control.dispatchEvent(new window.Event("change", { bubbles: true }));
    return control;
  };
  const key = (control, value) =>
    control.dispatchEvent(
      new window.KeyboardEvent("keydown", {
        key: value,
        bubbles: true,
        cancelable: true,
      }),
    );
  t.after(async () => {
    app.unmount();
    await window.happyDOM.abort();
  });
  return { window, root, mock, app, select, key };
}
function manyAccounts(mock) {
  const template = mock.state.library.accounts[0];
  mock.state.library.accounts = Array.from({ length: 200 }, (_, index) => ({
    ...structuredClone(template),
    ref: { id: `account-${String(index).padStart(3, "0")}`, generation: 1 },
    accountLabel: `account-${String(index).padStart(3, "0")} 长账户${"x".repeat(80)}`,
    service: {
      groupId: `service-${index % 40}`,
      label:
        index % 40 < 2
          ? "Identical label"
          : index % 40 === 39
            ? "其他"
            : `长服务 ${index % 40} ${"long-service".repeat(10)}`,
    },
  }));
}

test("200 accounts and 40 services use one labelled select and stable group IDs, including duplicate labels and other", (t) => {
  const h = fixture(t, manyAccounts);
  const service = h.root.querySelector('[data-setting="service"]');
  assert.equal(service.tagName, "SELECT");
  assert.equal(
    service.closest("label").querySelector("span").textContent,
    "Service",
  );
  assert.equal(service.options.length, 41);
  assert.equal(service.options[0].textContent, "All services (200)");
  assert.equal(service.options[1].textContent, "Identical label (5)");
  assert.equal(service.options[2].textContent, "Identical label (5)");
  assert.equal(h.root.querySelectorAll('[data-action="filter"]').length, 0);
  assert.equal(h.root.querySelectorAll(".claude-card").length, 200);
  const options = [...service.options];
  service.focus();
  h.select("service", "service-1");
  assert.deepEqual(h.mock.calls.at(-1), {
    method: "view.setServiceFilter",
    value: { serviceFilter: "service-1" },
  });
  assert.equal(h.root.querySelectorAll(".claude-card").length, 5);
  assert.deepEqual(
    [...h.root.querySelectorAll(".claude-card")].map(
      (node) => node.dataset.account,
    ),
    ["account-001", "account-041", "account-081", "account-121", "account-161"],
  );
  h.mock.emit();
  assert.ok(h.window.document.activeElement === service);
  assert.equal(service.options.length, options.length);
  assert.ok(
    options.every((option, index) => service.options[index] === option),
  );
  assert.equal(service.value, "service-1");
  const search = h.root.querySelector('[data-setting="query"]');
  search.value = "account-081";
  search.dispatchEvent(new h.window.Event("input", { bubbles: true }));
  assert.equal(h.root.querySelectorAll(".claude-card").length, 1);
  assert.equal(service.options[0].textContent, "All services (200)");
  h.root.querySelector('[data-action="clear"]').click();
  assert.equal(h.mock.state.library.view.query, "");
  assert.equal(service.value, "");
  assert.equal(h.root.querySelectorAll(".claude-card").length, 200);
  h.select("service", "service-39");
  assert.equal(h.root.querySelectorAll(".claude-card").length, 5);
  assert.equal(service.selectedOptions[0].textContent, "其他 (5)");
  h.mock.state.library.accounts = h.mock.state.library.accounts.filter(
    (account) => account.service.groupId !== "service-39",
  );
  h.mock.emit();
  assert.equal(service.value, "");
  assert.equal(service.options.length, 40);
  assert.equal(h.root.querySelectorAll(".claude-card").length, 195);
});

test("display disclosure supports keyboard, Escape, outside pointer and Tab departure without losing focus", (t) => {
  const h = fixture(t);
  const toggle = h.root.querySelector('[data-action="display"]');
  const panel = h.root.querySelector(".claude-display-panel");
  assert.equal(panel.hidden, true);
  assert.equal(toggle.getAttribute("aria-controls"), panel.id);
  toggle.focus();
  h.key(toggle, "Enter");
  assert.equal(panel.hidden, false);
  assert.equal(toggle.getAttribute("aria-expanded"), "true");
  const sort = h.root.querySelector('[data-setting="sort"]');
  sort.focus();
  const choices = [...sort.options];
  for (let tick = 0; tick < 10; tick++) h.mock.emit();
  assert.ok(h.window.document.activeElement === sort);
  assert.equal(panel.hidden, false);
  assert.equal(sort.options.length, choices.length);
  assert.ok(choices.every((choice, index) => sort.options[index] === choice));
  h.key(sort, "Escape");
  assert.equal(panel.hidden, true);
  assert.ok(h.window.document.activeElement === toggle);
  h.key(toggle, " ");
  assert.equal(panel.hidden, false);
  sort.focus();
  h.window.document.body.dispatchEvent(
    new h.window.Event("pointerdown", { bubbles: true }),
  );
  assert.equal(panel.hidden, true);
  assert.ok(h.window.document.activeElement === toggle);
  toggle.click();
  sort.focus();
  const search = h.root.querySelector('[data-setting="query"]');
  search.focus();
  assert.equal(panel.hidden, true);
  assert.ok(h.window.document.activeElement === search);
  toggle.click();
  h.mock.state.host.dialogOpen = true;
  h.mock.emit();
  assert.equal(panel.hidden, true);
  assert.equal(h.mock.calls.length, 0);
});

test("all grouped and flat sort options remain available", (t) => {
  const h = fixture(t);
  h.root.querySelector('[data-action="display"]').click();
  const sort = h.root.querySelector('[data-setting="sort"]');
  const groupSort = h.root.querySelector('[data-setting="groupSort"]');
  assert.equal(sort.options.length, 4);
  assert.equal(groupSort.closest("label").hidden, false);
  for (const value of [
    "oldest-first",
    "newest-first",
    "account-asc",
    "account-desc",
  ]) {
    h.select("sort", value);
    assert.deepEqual(h.mock.calls.at(-1).value, { groupedItemSort: value });
  }
  for (const value of ["name-desc", "name-asc"]) {
    h.select("groupSort", value);
    assert.deepEqual(h.mock.calls.at(-1).value, { groupSort: value });
  }
  h.select("mode", "flat");
  assert.equal(groupSort.closest("label").hidden, true);
  assert.equal(sort.options.length, 6);
  for (const value of [...sort.options].map((option) => option.value)) {
    h.select("sort", value);
    assert.deepEqual(h.mock.calls.at(-1).value, { flatSort: value });
  }
  assert.equal(h.mock.state.library.view.mode, "flat");
  assert.deepEqual(
    [...h.root.querySelectorAll(".claude-card")].map(
      (node) => node.dataset.account,
    ),
    h.mock.state.library.view.resultIds,
  );
});

test("management has one host preferences entry and separately named theme settings in every locale", (t) => {
  const h = fixture(t);
  for (const [language] of languages.filter(([id]) => id !== "auto")) {
    h.mock.state.preferences.resolvedLanguage = language;
    h.mock.emit();
    for (const key of [
      "view",
      "service",
      "manage",
      "groupData",
      "groupTools",
      "groupSettings",
      "groupApplication",
    ])
      assert.ok(localText(language, key));
    assert.equal(
      h.root.querySelectorAll('[data-value="settings:preferences"]').length,
      1,
    );
    assert.equal(
      h.root.querySelector('[data-value="appearance"] > span').textContent,
      localText(language, "appearance"),
    );
  }
  h.root.querySelector('[data-value="settings:preferences"]').click();
  assert.deepEqual(h.mock.calls.at(-1).value.request, {
    kind: "settings",
    section: "preferences",
  });
});
test("host appearance changes only for scheme or heading settings, without computed-style reads", (t) => {
  const h = fixture(t);
  const first = h.mock.appearances[0];
  assert.equal(h.mock.appearances.length, 1);
  h.window.getComputedStyle = () => {
    throw new Error("Theme must not sample styles");
  };
  for (let i = 0; i < 20; i++) h.mock.emit();
  h.app.update({
    settings: { density: "compact" },
  });
  assert.equal(h.mock.appearances.length, 1);
  h.app.update({ settings: { serifHeadings: false } });
  assert.equal(h.mock.appearances.length, 2);
  h.mock.sdk.preferences.set({ theme: "dark" });
  assert.equal(h.mock.appearances.length, 3);
  assert.notEqual(h.mock.appearances.at(-1).surface, first.surface);
  h.app.update({ settings: { serifHeadings: false } });
  assert.equal(h.mock.appearances.length, 3);
  h.app.unmount();
  h.mock.sdk.preferences.set({ theme: "light" });
  h.app.update({ settings: { serifHeadings: true } });
  assert.equal(h.mock.appearances.length, 3);
});

test("old SDK without host appearance still mounts and supports account and host actions", (t) => {
  const h = fixture(t, (mock) => {
    delete mock.sdk.host.setAppearance;
  });
  assert.equal(h.root.querySelectorAll(".claude-card").length, 6);
  h.root.querySelector('[data-account="google"] [data-action="copy"]').click();
  assert.equal(h.mock.calls.at(-1).method, "otp.copy");
  const scan = h.root.querySelector(
    '.claude-topbar-actions [data-value="scan-import"]',
  );
  assert.ok(scan && !scan.closest("[hidden]"));
  scan.click();
  assert.deepEqual(h.mock.calls.at(-1).value.request, { kind: "scan-import" });
  h.app.update({ settings: { serifHeadings: false } });
  assert.equal(
    h.root.querySelector(".claude-theme").dataset.serifHeadings,
    "false",
  );
});

test("host palette fields stay finite and compatible for each scheme and heading option", () => {
  for (const dark of [false, true])
    for (const serifHeadings of [false, true]) {
      const tokens = hostAppearance({ serifHeadings }, dark);
      for (const [key, value] of Object.entries(tokens)) {
        if (["radius", "controlRadius", "borderWidth"].includes(key))
          assert.ok(Number.isFinite(value));
        else if (["shadow", "controlShadow", "fontFamily"].includes(key))
          continue;
        else assert.match(value, /^#[0-9a-f]{6}$/i);
      }
      assert.ok(tokens.fontFamily.length <= 8);
    }
});

test("toolbar CSS keeps the service control bounded and 44px controls while giving only scan the strong CTA", async (t) => {
  const h = fixture(t, manyAccounts);
  for (const path of ["tokens", "components", "application"]) {
    const style = h.window.document.createElement("style");
    style.textContent = await readFile(
      new URL(`../src/styles/${path}.css`, import.meta.url),
      "utf8",
    );
    h.window.document.head.append(style);
  }
  const computed = (node) => h.window.getComputedStyle(node);
  const service = h.root.querySelector('[data-setting="service"]');
  assert.ok(parseFloat(computed(service).minHeight) >= 44);
  assert.equal(computed(service).minWidth, "0");
  assert.equal(computed(service).maxWidth, "100%");
  assert.equal(computed(service).textOverflow, "ellipsis");
  assert.equal(
    computed(h.root.querySelector(".claude-display-panel")).display,
    "none",
  );
  h.root.querySelector('[data-action="display"]').click();
  assert.equal(
    computed(h.root.querySelector(".claude-display-panel")).display,
    "grid",
  );
  const actions = [
    ...h.root.querySelectorAll(".claude-topbar-actions .claude-button"),
  ];
  assert.equal(
    actions.filter((node) => node.classList.contains("is-primary")).length,
    1,
  );
  assert.equal(
    actions.find((node) => node.classList.contains("is-primary")).dataset.value,
    "scan-import",
  );
  for (const control of actions) {
    assert.equal(computed(control).minHeight, "44px");
    if (!control.classList.contains("is-primary"))
      assert.ok(["", "none"].includes(computed(control).boxShadow));
  }
});

test("mobile topbar reserves both action hit areas while the brand and translated labels wrap", async (t) => {
  const h = fixture(t);
  for (const path of ["tokens", "components", "application"]) {
    const style = h.window.document.createElement("style");
    style.textContent = await readFile(
      new URL(`../src/styles/${path}.css`, import.meta.url),
      "utf8",
    );
    h.window.document.head.append(style);
  }
  const title = "2FA";
  const computed = (node) => h.window.getComputedStyle(node);
  const brand = h.root.querySelector(".claude-brand");
  const name = h.root.querySelector(".claude-brand-name");
  const actions = h.root.querySelector(".claude-topbar-actions");
  const buttons = [...actions.querySelectorAll("button")];
  assert.equal(buttons.length, 2);
  assert.equal(name.textContent, title);
  assert.equal(computed(brand).minWidth, "0");
  assert.equal(computed(name.parentElement).minWidth, "0");
  assert.equal(computed(name).overflowWrap, "anywhere");
  const translate = h.mock.sdk.i18n.t;
  for (const width of [320, 390, 600, 601]) {
    h.window.happyDOM.setViewport({ width, height: 844 });
    for (const [language, scanLabel] of [
      ["zh-CN", "扫描二维码"],
      ["de", "QR-Code scannen"],
    ]) {
      h.mock.state.preferences.resolvedLanguage = language;
      h.mock.sdk.i18n.t = (key, params) =>
        key === "fabScanQR" ? scanLabel : translate(key, params);
      h.mock.emit();
      assert.equal(buttons[0].textContent, scanLabel);
      assert.equal(buttons[1].textContent, localText(language, "manage"));
      assert.equal(name.textContent, title);
      for (const button of buttons) {
        assert.equal(computed(button).minWidth, "44px");
        assert.equal(computed(button).minHeight, "44px");
        assert.equal(button.hidden, false);
      }
    }
  }
  buttons[0].click();
  assert.deepEqual(h.mock.calls.at(-1).value.request, { kind: "scan-import" });
  buttons[1].click();
  assert.equal(h.root.querySelector(".claude-subpage").hidden, false);
});

test("host accents remain readable as text and primary fills in every scheme", () => {
  const luminance = (hex) => {
    const [r, g, b] = hex
      .slice(1)
      .match(/../g)
      .map((value) => {
        const channel = parseInt(value, 16) / 255;
        return channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4;
      });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => {
    const values = [luminance(a), luminance(b)].sort((a, b) => a - b);
    return (values[1] + 0.05) / (values[0] + 0.05);
  };
  for (const dark of [false, true]) {
    const tokens = hostAppearance({}, dark);
    for (const fill of [tokens.accent, tokens.accentHover]) {
      assert.ok(
        contrast(fill, tokens.surface) >= 4.5,
        `${dark}: accent text on surface`,
      );
      assert.ok(
        contrast(tokens.accentText, fill) >= 4.5,
        `${dark}: text on primary fill`,
      );
    }
    assert.ok(
      contrast(tokens.text, tokens.surface) >= 4.5,
      `${dark}: readable body text`,
    );
  }
});
