# Clearpath Android 1.4

This packages the tested correctness pass from source commit `67c092089e7f1e517f75d9c3c19eb48055df522d`: final-versus-partial expense payments, first-payment-month planning, reliable schedule/ledger BNPL progress reconstruction, and shared notifications. The user subsequently explicitly requested packaging this update while retaining the existing backup/update mechanism. The actual physical-phone Lazada record remains unverified; no test fixture is claimed to be that record.

Reuse the existing native wrapper and debug signing key. Version name 1.4 / code 5; package `io.clearpath.app`; same Clearpath name, icon, HTTPS storage origin and localStorage key. No changes to backup/restore, native Java code or saved-data migration. No signing key is regenerated or changed. Install as Update, never uninstall or clear data to work around a signing error.

Build sequence: fresh production web build → local production server → current safety-copy/clean-restore gate → route/asset packaging → existing Android compile/sign → source/asset hash and latest-UI validation → emulator in-place update and record equality/native smoke → GitHub prerelease upload and anonymous download checksum verification.

The pre-existing v1.3 APK is not overwritten. Output: `Clearpath-Debt-Planner-v1.4-debug.apk`, an installable debug/test build rather than a production-signed Play Store release. Financial backups, test plans and signing secrets are never bundled or uploaded as release assets. Exact file paths, public download URL and completed QA results are provided in the final handoff.
