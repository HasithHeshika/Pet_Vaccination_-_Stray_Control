#!/bin/bash

# Favicon Generator Script for Pet Management System
# This script generates favicon.ico and PNG icons from the SVG source

echo "🐾 Pet Management System - Favicon Generator"
echo "============================================="
echo ""

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "⚠️  ImageMagick is not installed."
    echo ""
    echo "Please install it first:"
    echo "  Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "  macOS: brew install imagemagick"
    echo "  Windows: Download from https://imagemagick.org/script/download.php"
    echo ""
    echo "Or use online tools:"
    echo "  1. Go to https://favicon.io/favicon-converter/"
    echo "  2. Upload frontend/public/pet-icon.svg"
    echo "  3. Download and extract to frontend/public/"
    echo ""
    exit 1
fi

# Navigate to public directory
cd "$(dirname "$0")"

echo "📁 Working directory: $(pwd)"
echo ""

# Check if source SVG exists
if [ ! -f "pet-icon.svg" ]; then
    echo "❌ Error: pet-icon.svg not found!"
    echo "Please create the SVG icon first."
    exit 1
fi

echo "✅ Found pet-icon.svg"
echo ""
echo "Generating icons..."
echo ""

# Generate PNG icons
echo "📷 Generating logo192.png (192x192)..."
convert pet-icon.svg -resize 192x192 -background none logo192.png

echo "📷 Generating logo512.png (512x512)..."
convert pet-icon.svg -resize 512x512 -background none logo512.png

echo "📷 Generating apple-touch-icon.png (180x180)..."
convert pet-icon.svg -resize 180x180 -background none apple-touch-icon.png

# Generate favicon.ico with multiple sizes
echo "🎯 Generating favicon.ico (multi-size)..."
convert pet-icon.svg -resize 256x256 -background none \
    \( -clone 0 -resize 16x16 \) \
    \( -clone 0 -resize 32x32 \) \
    \( -clone 0 -resize 48x48 \) \
    \( -clone 0 -resize 64x64 \) \
    -delete 0 -alpha on -colors 256 favicon.ico

echo ""
echo "✅ Favicon generation complete!"
echo ""
echo "Generated files:"
echo "  ✓ favicon.ico (16x16, 32x32, 48x48, 64x64)"
echo "  ✓ logo192.png (192x192)"
echo "  ✓ logo512.png (512x512)"
echo "  ✓ apple-touch-icon.png (180x180)"
echo ""
echo "🔄 Please refresh your browser (Ctrl+Shift+R) to see the new favicon!"
echo ""
