# Dynamic Snippets

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

1. Open **Settings** > **Community Plugins**
2. Search for **Dynamic Snippets**
3. Click **Install**, then **Enable**

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
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
