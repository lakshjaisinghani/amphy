import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "../package.json";

const { version } = packageJson;

// Convert from Semver (example: 0.1.0-beta6)
const [major, minor, patch] = version
    // can only contain digits, dots, or dash
    .replace(/[^\d.-]+/g, "")
    // split into version parts
    .split(/[.-]/);

export default defineManifest(async (env) => ({
    manifest_version: 3,
    name: "💊Amphy",
    description: "Amphy is a browser extension that helps you create and study notes with AI.",
    version: `${major}.${minor}.${patch}`,
    version_name: version,
    icons: {
        "16": "src/assets/icons/icon-16.png",
        "32": "src/assets/icons/icon-32.png",
        "48": "src/assets/icons/icon-48.png",
        "128": "src/assets/icons/icon-128.png",
    },
    content_scripts: [
        {
            matches: ["https://*/*"],
            js: ["src/content/index.ts"],
        },
    ],
    action: {
        default_popup: "src/popup/popup.html",
        default_icon: {
            "128": "src/assets/icons/icon-128.png",
        },
    },
    options_ui: {
        page: "src/options/options.html",
    },
    permissions: ["storage", "activeTab"] as chrome.runtime.ManifestPermissions[],
}));
