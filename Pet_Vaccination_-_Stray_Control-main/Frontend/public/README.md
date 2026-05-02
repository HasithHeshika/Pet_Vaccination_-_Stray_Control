# Public Assets

## Favicon and Icons

This folder contains the favicon and app icons for the Pet Management System.

### Current Setup

- **Tab Title:** "Pet Management System - Vaccination & Stray Control"
- **Theme Color:** #4CAF50 (Green - representing nature/animals)
- **Icons:** Pet paw print design

### Files

- `favicon.ico` - Browser tab icon (16x16, 32x32, 64x64)
- `logo192.png` - PWA icon (192x192)
- `logo512.png` - PWA icon (512x512)
- `pet-icon.svg` - Source SVG for the paw print icon
- `manifest.json` - Web app manifest
- `index.html` - Main HTML template

### To Generate Custom Favicon

If you want to create a custom favicon from the SVG:

1. **Online Tool (Easiest):**
   - Go to https://favicon.io/favicon-converter/
   - Upload `pet-icon.svg`
   - Download the generated files
   - Replace `favicon.ico`, `logo192.png`, and `logo512.png`

2. **Using ImageMagick (Command Line):**
   ```bash
   # Convert SVG to different sizes
   convert pet-icon.svg -resize 192x192 logo192.png
   convert pet-icon.svg -resize 512x512 logo512.png
   convert pet-icon.svg -resize 64x64 favicon.ico
   ```

3. **Using Node.js (Automated):**
   ```bash
   npm install -g sharp-cli
   sharp -i pet-icon.svg -o logo192.png resize 192 192
   sharp -i pet-icon.svg -o logo512.png resize 512 512
   sharp -i pet-icon.svg -o favicon.ico resize 64 64
   ```

### Customizing the Icon

Edit `pet-icon.svg` to customize:
- **Colors:** Change the gradient colors in the `<linearGradient>` section
- **Design:** Modify the paw print shapes or create a new design
- **Theme:** Current theme is green (#4CAF50) representing animals/nature

### App Metadata

Configured in `index.html`:
- **Title:** Pet Management System - Vaccination & Stray Control
- **Description:** Pet Ownership, Vaccination & Stray Control System
- **Theme Color:** #4CAF50 (green)

Configured in `manifest.json`:
- **Short Name:** Pet Management
- **Full Name:** Pet Vaccination & Stray Control System
- **Display:** Standalone (PWA)

### Browser Compatibility

The current setup supports:
- ✅ Chrome/Edge/Brave (favicon + PWA)
- ✅ Firefox (favicon)
- ✅ Safari (Apple Touch Icon)
- ✅ Mobile devices (PWA icons)

### Notes

- The favicon will appear in browser tabs
- PWA icons appear when app is installed on mobile/desktop
- Theme color affects the browser's address bar on mobile
- Changes to these files require a hard refresh (Ctrl+Shift+R) in the browser
