/** Shared visual tokens for host dialogs and public pages; no DOM or theme code required. */
export function hostAppearance(_settings = {}, dark = false) {
  return {
    surface: dark ? "#2f2e2b" : "#ffffff",
    subtle: dark ? "#242321" : "#faf9f5",
    hover: dark ? "#393731" : "#f0eee7",
    text: dark ? "#f2f0e9" : "#262624",
    muted: dark ? "#bbb7ad" : "#6b6862",
    line: dark ? "#49463f" : "#e2dfd6",
    stroke: dark ? "#49463f" : "#e2dfd6",
    // Host accent is used as both text and fill, so use the stronger ink color.
    accent: dark ? "#e59a78" : "#a74b2d",
    accentHover: dark ? "#efb294" : "#8e3d23",
    accentText: dark ? "#242321" : "#ffffff",
    selected: dark ? "#49352c" : "#f6e8df",
    danger: dark ? "#f1a096" : "#b12f2d",
    dangerBackground: dark ? "#482f2c" : "#fbe9e5",
    dangerFill: dark ? "#f1a096" : "#b12f2d",
    dangerFillHover: dark ? "#ffc0b7" : "#922423",
    dangerText: dark ? "#242321" : "#ffffff",
    warning: dark ? "#e5c381" : "#805b16",
    warningBackground: dark ? "#433924" : "#f7eedb",
    success: dark ? "#a5c8ac" : "#42684b",
    successBackground: dark ? "#2e3e32" : "#e9f0e7",
    radius: 14,
    controlRadius: 10,
    borderWidth: 1,
    shadow: null,
    controlShadow: null,
    fontFamily: [
      "ui-sans-serif",
      "system-ui",
      "-apple-system",
      "PingFang SC",
      "Microsoft YaHei",
      "sans-serif",
    ],
  };
}
