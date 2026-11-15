export const theme = {
  themeApiVersion: 2,
  kind: "app",
  sdkApiVersion: 1,
  id: "claude-for-2fa",
  name: "Claude",
  version: "1.0.0",
  minHostVersion: "1.13.1",
  author: "2FA Theme Contributors",
  description:
    "A Claude-inspired reading room: a quiet service sidebar beside one centred column of accounts, with warm paper and terracotta accents.",
  entry: "src/theme.js",
  preview: "preview.webp",
  styles: [
    "src/styles/tokens.css",
    "src/styles/components.css",
    "src/styles/application.css",
    "src/styles/reading-room.css",
  ],
  capabilities: ["accounts", "host-flows", "preferences"],
  settings: [
    {
      key: "density",
      type: "select",
      label: "信息密度 / Density",
      default: "comfortable",
      options: [
        { value: "comfortable", label: "舒适 / Comfortable" },
        { value: "compact", label: "紧凑 / Compact" },
      ],
    },
    {
      key: "serifHeadings",
      type: "boolean",
      label: "衬线标题 / Serif headings",
      default: true,
    },
  ],
};
