#!/usr/bin/env bash
# Gera todos os ícones do jogo a partir de build/icon-rounded.png (ou build/icon.png)
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="build/icon-rounded.png"
[ -f "$SRC" ] || SRC="build/icon.png"

mkdir -p www/assets build/android/res/mipmap-mdpi build/android/res/mipmap-hdpi \
  build/android/res/mipmap-xhdpi build/android/res/mipmap-xxhdpi build/android/res/mipmap-xxxhdpi

# Web / PWA
for s in 48 72 96 144 192 384 512 1024; do
  convert "$SRC" -resize ${s}x${s} "www/assets/icon-${s}.png"
done
cp www/assets/icon-512.png www/assets/icon-512-maskable.png
convert "$SRC" -resize 180x180 www/assets/apple-touch-icon.png
convert "$SRC" -resize 32x32 www/favicon.png

# Android (Capacitor)
convert "$SRC" -resize 48x48   build/android/res/mipmap-mdpi/ic_launcher.png
convert "$SRC" -resize 72x72   build/android/res/mipmap-hdpi/ic_launcher.png
convert "$SRC" -resize 96x96   build/android/res/mipmap-xhdpi/ic_launcher.png
convert "$SRC" -resize 144x144 build/android/res/mipmap-xxhdpi/ic_launcher.png
convert "$SRC" -resize 192x192 build/android/res/mipmap-xxxhdpi/ic_launcher.png
convert "$SRC" -resize 512x512 build/android/res/ic_launcher-playstore.png

echo "Ícones gerados a partir de $SRC"

# ---------- Android: ícones adaptativos ----------
declare -A DENS=( [mdpi]=108 [hdpi]=162 [xhdpi]=216 [xxhdpi]=324 [xxxhdpi]=432 )
for d in "${!DENS[@]}"; do
  size=${DENS[$d]}
  inner=$(( size * 66 / 100 ))
  convert build/icon.png -resize ${inner}x${inner} -background none -gravity center \
    -extent ${size}x${size} "build/android/res/mipmap-${d}/ic_launcher_foreground.png"
  cp "build/android/res/mipmap-${d}/ic_launcher.png" "build/android/res/mipmap-${d}/ic_launcher_round.png"
done

mkdir -p build/android/res/mipmap-anydpi-v26 build/android/res/values
cat > build/android/res/mipmap-anydpi-v26/ic_launcher.xml <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
XML
cp build/android/res/mipmap-anydpi-v26/ic_launcher.xml build/android/res/mipmap-anydpi-v26/ic_launcher_round.xml
cat > build/android/res/values/ic_launcher_background.xml <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#060B0A</color>
</resources>
XML

# ---------- iOS: AppIcon.appiconset ----------
IOS=build/ios/AppIcon.appiconset
rm -rf "$IOS"; mkdir -p "$IOS"
cat > "$IOS/Contents.json" <<'JSON'
{
  "images" : [
    { "size" : "20x20", "idiom" : "iphone", "scale" : "2x", "filename" : "icon-20@2x.png" },
    { "size" : "20x20", "idiom" : "iphone", "scale" : "3x", "filename" : "icon-20@3x.png" },
    { "size" : "29x29", "idiom" : "iphone", "scale" : "2x", "filename" : "icon-29@2x.png" },
    { "size" : "29x29", "idiom" : "iphone", "scale" : "3x", "filename" : "icon-29@3x.png" },
    { "size" : "40x40", "idiom" : "iphone", "scale" : "2x", "filename" : "icon-40@2x.png" },
    { "size" : "40x40", "idiom" : "iphone", "scale" : "3x", "filename" : "icon-40@3x.png" },
    { "size" : "60x60", "idiom" : "iphone", "scale" : "2x", "filename" : "icon-60@2x.png" },
    { "size" : "60x60", "idiom" : "iphone", "scale" : "3x", "filename" : "icon-60@3x.png" },
    { "size" : "20x20", "idiom" : "ipad", "scale" : "1x", "filename" : "icon-20.png" },
    { "size" : "20x20", "idiom" : "ipad", "scale" : "2x", "filename" : "icon-20@2x.png" },
    { "size" : "29x29", "idiom" : "ipad", "scale" : "1x", "filename" : "icon-29.png" },
    { "size" : "29x29", "idiom" : "ipad", "scale" : "2x", "filename" : "icon-29@2x.png" },
    { "size" : "40x40", "idiom" : "ipad", "scale" : "1x", "filename" : "icon-40.png" },
    { "size" : "40x40", "idiom" : "ipad", "scale" : "2x", "filename" : "icon-40@2x.png" },
    { "size" : "76x76", "idiom" : "ipad", "scale" : "1x", "filename" : "icon-76.png" },
    { "size" : "76x76", "idiom" : "ipad", "scale" : "2x", "filename" : "icon-76@2x.png" },
    { "size" : "83.5x83.5", "idiom" : "ipad", "scale" : "2x", "filename" : "icon-83.5@2x.png" },
    { "size" : "1024x1024", "idiom" : "ios-marketing", "scale" : "1x", "filename" : "icon-1024.png" }
  ],
  "info" : { "version" : 1, "author" : "xcode" }
}
JSON

# iOS exige ícones sem transparência (fundo opaco)
gen_ios() { convert build/mask/icon-ios.png -resize "$2" "$IOS/$1"; }
mkdir -p build/mask
convert build/icon.png -background "#060b0a" -alpha remove -alpha off build/mask/icon-ios.png
for spec in "icon-20.png 20" "icon-20@2x.png 40" "icon-20@3x.png 60" "icon-29.png 29" "icon-29@2x.png 58" "icon-29@3x.png 87" \
            "icon-40.png 40" "icon-40@2x.png 80" "icon-40@3x.png 120" "icon-60@2x.png 120" "icon-60@3x.png 180" \
            "icon-76.png 76" "icon-76@2x.png 152" "icon-83.5@2x.png 167" "icon-1024.png 1024"; do
  set -- $spec
  convert build/mask/icon-ios.png -resize "$2x$2" "$IOS/$1"
done

echo "Ícones nativos (Android adaptativo + iOS) gerados"
