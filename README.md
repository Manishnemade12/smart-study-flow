# SSC Smart Notes

## PWA setup

This app is now configured as a Progressive Web App.

### What it includes
- Offline support through a generated service worker
- Install prompt on supported browsers
- Mobile home-screen support guidance for iPhone/iPad
- App-like standalone launch via the web manifest

### Run locally
```bash
npm install
npm run dev
```

### Build for production
```bash
npm run build
npm run preview
```

### Notes
- The previous Electron-specific files were removed.
- The homepage now shows an install card instead of desktop download buttons.
- Replace the SVG icons in `public/` with PNG variants later if you want stricter store/browser compatibility.
