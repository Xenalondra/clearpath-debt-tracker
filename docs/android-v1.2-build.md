# Clearpath v1.2 Android build

Built October 10, 2026 from the latest workspace, including the uncommitted final mobile/chart polish.

## Download and identity

- File: `Clearpath-Debt-Planner-v1.2-debug.apk`
- Download copy: `/Users/maryantoinetteabuela/Documents/ChatGPT/Debt and Expenses Tracker/downloads/Clearpath-Debt-Planner-v1.2-debug.apk`
- Original build output: `/Users/maryantoinetteabuela/Documents/ChatGPT/Debt and Expenses Tracker/android-wrapper/output/Clearpath-Debt-Planner-v1.2-debug.apk`
- Type: **debug APK**, signed with the existing debug key. No configured release signing was found; no key was generated or replaced.
- Size: 2,097,966 bytes.
- Package: `io.clearpath.app`; application name: Clearpath; versionName: 1.2; versionCode: 3.
- SHA-256: `f2f8abfa9b09b68635adac49e0ee48f4b3b30f8fa6e99f4b4eb7b8523a6dadec`.

The signing certificate matches v1.1, allowing an in-place update without uninstalling. Export a backup first, then install over the existing application to preserve local data. Uninstalling can remove that data.

## Fresh build provenance

Ran `npm run build` → production server → `node android-wrapper/package-web.mjs` → existing `build-apk.sh` → `validate-apk.mjs`. No older cached web build was used. The packaging script replaces only its generated web assets, not user records.

All 43 bundled assets were checksum-verified, including exact matches to fresh production JavaScript. Six route shells were bundled. Validation confirms the new projected chart labels and balance-detail interactions are present.

Base Git commit: `462fc179ec4cb24300e07ea1679b9b99cb76e2c1`. Latest changes remain uncommitted, so this hash alone is not the APK source identifier. The new build manifest also records dirty state and a fingerprint of current web/native source inputs:

`2aea331eadfaa28dd9ec54558705c4553244e631be70a816338c85e2c15073a8`

No new framework, financial-rule changes, schema migration, app icon replacement, application-ID change or signing-secret changes were made.

## Verification

- Production web build: PASS.
- Unit/server-render tests: 33 passed, 0 failed.
- All nine Playwright regression suites against the fresh production build: PASS.
- Six widths, 360/375/390/430/768/1280px: PASS.
- TypeScript and whitespace checks: PASS.
- Offline bundled assets/routes and local-storage persistence: PASS.
- APK existence, package/version/icon metadata, signature and all bundled asset hashes: PASS.
- Native emulator update installation and launch: PASS.
- Native routes/mobile layout, canonical future chart total, detail popover, BNPL payoff, Completed and Activity: PASS.
- Native tests restored the original local plan; installation used `adb install -r`, not uninstall/data clearing.

The Android full-page screenshot tool produced repeated compositor tiles; DOM checks confirmed a single header/overview and viewport screenshots were used instead. This was a capture artifact, not duplicated application content.

## Files changed for packaging

`android-wrapper/AndroidManifest.xml`, `build-apk.sh`, `package-web.mjs`, `validate-apk.mjs`, new `source-fingerprint.mjs`, and `tests/playwright-android-device.mjs`. Existing UI changes are listed in `docs/mobile-chart-polish.md`.

## Limits

This is an installable debug APK, not a signed release/store distribution. Native testing used the existing API 36 emulator, not a physical phone. Java compilation reported existing deprecated-API/bootstrap warnings but completed successfully. The hosted website was not redeployed and no public APK download endpoint was created; the provided artifact is the actual local APK file.
