#!/bin/sh
set -eu

SDK="$HOME/Library/Android/sdk"
TOOLS="$SDK/build-tools/36.0.0"
ANDROID_JAR="$SDK/platforms/android-36/android.jar"
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BUILD="$ROOT/build"
OUT="$ROOT/output"

mkdir -p "$BUILD/classes" "$BUILD/compiled" "$OUT"
test -f "$ROOT/assets/web/build-info.json" || { echo "Package a fresh production web build first." >&2; exit 1; }
test -f "$ROOT/debug.keystore" || { echo "Existing signing key is unavailable; no key will be replaced or generated." >&2; exit 1; }
find "$BUILD" -type f -delete

"$TOOLS/aapt2" compile --dir "$ROOT/res" -o "$BUILD/compiled/resources.zip"
"$TOOLS/aapt2" link -o "$BUILD/base.apk" -I "$ANDROID_JAR" --manifest "$ROOT/AndroidManifest.xml" -A "$ROOT/assets" "$BUILD/compiled/resources.zip"
javac -source 8 -target 8 -classpath "$ANDROID_JAR" -d "$BUILD/classes" "$ROOT/java/io/clearpath/app/MainActivity.java"
jar cf "$BUILD/classes.jar" -C "$BUILD/classes" .
"$TOOLS/d8" --lib "$ANDROID_JAR" --output "$BUILD" "$BUILD/classes.jar"
cp "$BUILD/base.apk" "$BUILD/with-dex.apk"
(cd "$BUILD" && "$TOOLS/aapt" add with-dex.apk classes.dex)
"$TOOLS/zipalign" -f 4 "$BUILD/with-dex.apk" "$BUILD/aligned.apk"

"$TOOLS/apksigner" sign --ks "$ROOT/debug.keystore" --ks-key-alias clearpath --ks-pass pass:android --key-pass pass:android --out "$OUT/Clearpath-Debt-Planner-v1.1-debug.apk" "$BUILD/aligned.apk"
"$TOOLS/apksigner" verify --verbose "$OUT/Clearpath-Debt-Planner-v1.1-debug.apk"
printf '%s\n' "$OUT/Clearpath-Debt-Planner-v1.1-debug.apk"
