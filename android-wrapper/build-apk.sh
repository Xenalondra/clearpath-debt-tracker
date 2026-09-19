#!/bin/sh
set -eu

SDK="$HOME/Library/Android/sdk"
TOOLS="$SDK/build-tools/36.0.0"
ANDROID_JAR="$SDK/platforms/android-36/android.jar"
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BUILD="$ROOT/build"
OUT="$ROOT/output"

mkdir -p "$BUILD/classes" "$BUILD/compiled" "$OUT"
find "$BUILD" -type f -delete

"$TOOLS/aapt2" compile --dir "$ROOT/res" -o "$BUILD/compiled/resources.zip"
"$TOOLS/aapt2" link -o "$BUILD/base.apk" -I "$ANDROID_JAR" --manifest "$ROOT/AndroidManifest.xml" "$BUILD/compiled/resources.zip"
javac -source 8 -target 8 -classpath "$ANDROID_JAR" -d "$BUILD/classes" "$ROOT/java/io/clearpath/app/MainActivity.java"
jar cf "$BUILD/classes.jar" -C "$BUILD/classes" .
"$TOOLS/d8" --lib "$ANDROID_JAR" --output "$BUILD" "$BUILD/classes.jar"
cp "$BUILD/base.apk" "$BUILD/with-dex.apk"
(cd "$BUILD" && "$TOOLS/aapt" add with-dex.apk classes.dex)
"$TOOLS/zipalign" -f 4 "$BUILD/with-dex.apk" "$BUILD/aligned.apk"

if [ ! -f "$ROOT/debug.keystore" ]; then
  keytool -genkeypair -keystore "$ROOT/debug.keystore" -storepass android -alias clearpath -keypass android -dname "CN=Clearpath, OU=Personal, O=Clearpath, L=Manila, C=PH" -keyalg RSA -keysize 2048 -validity 10000
fi
"$TOOLS/apksigner" sign --ks "$ROOT/debug.keystore" --ks-key-alias clearpath --ks-pass pass:android --key-pass pass:android --out "$OUT/clearpath-debt-planner.apk" "$BUILD/aligned.apk"
"$TOOLS/apksigner" verify --verbose "$OUT/clearpath-debt-planner.apk"
printf '%s\n' "$OUT/clearpath-debt-planner.apk"
