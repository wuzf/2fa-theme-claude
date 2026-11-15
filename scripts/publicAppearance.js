import { hostAppearance } from "../src/hostAppearance.js";

/** Build-time data only: login, setup and public OTP pages never load theme JavaScript. */
export function createPublicAppearance() {
  return {
    formatVersion: 1,
    light: hostAppearance({}, false),
    dark: hostAppearance({}, true),
    fonts: [],
    variants: [],
  };
}
