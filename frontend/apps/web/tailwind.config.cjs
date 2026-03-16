const base = require("../../tooling/tailwind/tailwind.base.cjs");

module.exports = {
  ...base,
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/app-core/src/**/*.{ts,tsx}",
    "../../packages/features/**/*.{ts,tsx}"
  ]
};

