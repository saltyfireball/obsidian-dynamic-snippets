# Dynamic Snippets

![VHS Tracking](https://img.shields.io/badge/vhs%20tracking-adjusting-fff?style=flat&logo=youtube&logoColor=FFFFFF&label=VHS%20tracking&labelColor=5B595C&color=78DCE8) ![Power Point](https://img.shields.io/badge/powerpoint-47%20slides%20no%20conclusion-fff?style=flat&logo=microsoftpowerpoint&logoColor=FFFFFF&label=power%20point&labelColor=5B595C&color=FFD866) ![Veggie](https://img.shields.io/badge/veggie-pizza%20counts%20right-fff?style=flat&logo=pizzahut&logoColor=FFFFFF&label=veggie&labelColor=5B595C&color=FFD866) ![Burnout](https://img.shields.io/badge/burnout-speedrunning-fff?style=flat&logo=speedtest&logoColor=FFFFFF&label=burnout&labelColor=5B595C&color=FF6188) ![Vaporwave](https://img.shields.io/badge/vaporwave-aesthetic-fff?style=flat&logo=soundcloud&logoColor=FFFFFF&label=vaporwave&labelColor=5B595C&color=FF6188) ![Certified](https://img.shields.io/badge/certified-non%20vibe%20coder-fff?style=flat&logo=checkmarx&logoColor=FFFFFF&label=certified&labelColor=5B595C&color=FFD866) ![Internet Points](https://img.shields.io/badge/internet%20points-worthless%20and%20priceless-fff?style=flat&logo=reddit&logoColor=FFFFFF&label=internet%20points&labelColor=5B595C&color=FF6188) ![Refactoring](https://img.shields.io/badge/refactoring-same%20bugs%20new%20code-fff?style=flat&logo=codereview&logoColor=FFFFFF&label=refactoring&labelColor=5B595C&color=A9DC76) ![Typing](https://img.shields.io/badge/typing-three%20dots%20forever-fff?style=flat&logo=whatsapp&logoColor=FFFFFF&label=typing&labelColor=5B595C&color=5C7CFA)

<p align="center">
  <img src="assets/header.svg" width="600" />
</p>

An Obsidian plugin for managing custom CSS and JavaScript snippets with per-device control.

## Features

- **CSS Snippets** -- Add custom CSS that styles your vault
- **JavaScript Snippets** -- Run custom JavaScript when Obsidian loads
- **Per-Device Control** -- Enable or disable each snippet independently on each device (iPhone, iPad, Mac, Windows, Android, Linux)
- **Device Registry** -- Automatically detects and registers each device, with customizable names
- **Clipboard Support** -- Built-in copy, paste, select all, and clear controls in the snippet editor
- **JS Cleanup Support** -- JavaScript snippets can register cleanup functions via `window._dsCleanup` for proper teardown

## Installation

### From Obsidian Community Plugins

**Might not be approved yet**

1. Open **Settings** > **Community Plugins**
2. Search for **Dynamic Snippets**
3. Click **Install**, then **Enable**

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](../../releases/latest)
2. Create a folder called `dynamic-snippets` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into that folder
4. Restart Obsidian and enable the plugin in **Settings** > **Community Plugins**

## Usage

### CSS Snippets

1. Open **Settings** > **Dynamic Snippets** > **CSS Snippets** tab
2. Click **+ Add Snippet**
3. Give it a name and enter your CSS code
4. Toggle which devices should use this snippet
5. Click **Add Snippet** to save

Example use cases:

- Mobile-specific font sizes
- Dark mode tweaks for specific themes
- Custom heading styles
- Platform-specific layout adjustments

### JavaScript Snippets

1. Open **Settings** > **Dynamic Snippets** > **JS Snippets** tab
2. Click **+ Add JS Snippet**
3. Give it a name and enter your JavaScript code
4. Toggle which devices should use this snippet
5. Click **Add Snippet** to save

**Security Warning:** JavaScript snippets have full access to Obsidian and your vault. Only add code you trust.

#### Cleanup Functions

If your JavaScript snippet creates listeners or intervals, register a cleanup function:

```javascript
// Register cleanup so the snippet can be properly removed
if (!window._dsCleanup) window._dsCleanup = {};
window._dsCleanup["my-snippet"] = () => {
    // cleanup code here
};
```

### Device Management

Each device is automatically detected and registered when the plugin loads. You can:

- **Rename devices** in the settings to easily identify them (e.g., "Work Mac", "Phone")
- **Toggle snippets per device** using the checkboxes next to each device name
- View device type (iPhone, Mac, Windows, etc.) next to each device entry

## Development

```bash
npm install
npm run dev    # watch mode
npm run build  # production build
```

## License

[MIT](LICENSE)
