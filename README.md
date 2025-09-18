<img src="https://s2.loli.net/2025/09/19/DNCs97PHEQeOczJ.png" alt="Kazago Banner" width="64" align="left">

# Kazago

**A browser extension that helps Arthur Morgan reserve his favorite seat in the Deep South tavern.**

<a href="https://www.rockstargames.com/reddeadredemption2/downloads">
	<img src="https://custom-icon-badges.herokuapp.com/badge/rdr2-learn_more-FCAF17?logoColor=FCAF17&style=for-the-badge&logo=rockstargames&labelColor=363B40" alt="Learn about RDR2"/>
</a>
<a href="mailto:hiiiroko@proton.me">
	<img src="https://custom-icon-badges.herokuapp.com/badge/mail-contact_me-AE75DA?logoColor=AE75DA&style=for-the-badge&logo=mail&labelColor=363B40" alt="Contact Me"/>
</a>
<a href="https://github.com/hiiiroko/kazago">
	<img src="https://custom-icon-badges.herokuapp.com/badge/releases-download-33A1E0?logoColor=33A1E0&style=for-the-badge&logo=download&labelColor=363B40" alt="Download Releases"/>
</a>

## Features

- Set your preferred seat and the extension will try to reserve it first.
- Classic Windows 98 style interface, perfectly fitting the Wild West era.
- Automatically follows your browser theme, seamless day & night switching.
- Detailed reservation progress and status display, everything under control.

## Preview

<p float="left">
  <img src="https://s2.loli.net/2025/09/19/cdqzgh2IfY6V4Ap.png" width="25%"/>
  <img src="https://s2.loli.net/2025/09/19/ZsiHM1jeJpmOy2P.png" width="25%"/>
</p>

## Install

1. Download or clone this repo.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the project folder.

### Project Structure

```
kazago/
├── background.js        # service worker
├── content.js           # content script
├── manifest.json        # extension manifest (v3)
├── popup.html           # popup window
├── popup.css            # retro styles
├── popup.js             # popup logic
├── utils.js             # shared utilities
├── icons/               # extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── assets/
    ├── LOGO.png
    └── ChillBitmap.ttf  # pixel font
```

## Links

- [Issue Tracker](https://github.com/hiiiroko/kazago/issues)
- [Discussions](https://github.com/hiiiroko/kazago/discussions)

## Acknowledgements

Kazago is inspired by or built upon:

- [98.css](https://github.com/jdan/98.css) – Windows 98 style CSS framework
- [ChillBitmap](https://github.com/Warren2060/ChillBitmap) – beautiful pixel bitmap font
- [Lruler](https://github.com/Lruler) – original extension idea

## License

MIT License – see [LICENSE](./LICENSE) for details.

## Contributing

Issues, feature requests, and PRs are welcome!