import { mount } from "../src/theme.js";
import { createSyntheticSdk } from "./synthetic-sdk.js";

const query = new URLSearchParams(location.search);
const shell = createSyntheticSdk({
  onCall(method, value) {
    if (method === "host.setAppearance") return;
    document.querySelector("#dev-output").textContent =
      method +
      " · " +
      JSON.stringify(value, (key, item) =>
        key === "options" ? undefined : item,
      );
  },
});
shell.sdk.clock.now = () => 45000; // Stable synthetic specimen; no real OTP clock.
shell.sdk.preferences.set({
  theme: query.get("scheme") || "light",
  language: query.get("lang") || "zh-CN",
});
shell.sdk.view.setMode("flat");
if (query.get("count") === "0") {
  const state = structuredClone(shell.state);
  state.library.accounts = [];
  shell.replace(state);
}
const app = mount({
  root: document.querySelector("#app"),
  sdk: shell.sdk,
  appearance: {
    package: { id: "claude-for-2fa", name: "Claude", version: "1.0.0" },
    settings: {
      density: query.get("density") || "comfortable",
      serifHeadings: query.get("serif") !== "false",
    },
  },
});
document.querySelector("#dev-output").textContent = "";
document.querySelector("#dev-scheme").onclick = () => {
  const dark = shell.sdk.getSnapshot().preferences.resolvedTheme === "dark";
  shell.sdk.clock.now = () => 45000; // Stable synthetic specimen; no real OTP clock.
  shell.sdk.preferences.set({ theme: dark ? "light" : "dark" });
};
window.addEventListener("pagehide", () => app.unmount(), { once: true });
