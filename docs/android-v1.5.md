# Clearpath Android 1.5

Version 1.5 / code 6 packages all current Clearpath changes, including reliable-subset portfolio progress and explicit future-obligation advance payments. The existing native wrapper, package `io.clearpath.app`, Clearpath name/icon, HTTPS storage origin, localStorage key and debug signing key are retained. No native Java, backup/update mechanism or saved-data migration is changed for packaging. Payment transaction metadata from the latest web implementation is preserved.

Build sequence: fresh production web build and TypeScript/unit validation → production server → current private safety-copy/clean-restore gate → exact route/asset packaging → existing Android compile/sign → source/asset/hash validation → offline bundle and emulator in-place update smoke → GitHub prerelease upload → anonymous APK download/hash verification.

Output: `android-wrapper/output/Clearpath-Debt-Planner-v1.5-debug.apk`. This is an installable debug/test build signed with the same existing certificate, not a production release-signed Play Store build. Previous APKs are not overwritten. Private financial records, test backups and signing keys are never included as release assets.

Install as an **update** over the existing app. Do not uninstall or clear app data. If Android reports a signing mismatch or demands an uninstall, stop. In-place emulator preservation can be verified; the user's physical phone and actual Lazada records are not accessible and cannot be claimed as tested. An exported safety backup is recommended before any update, but no backup is required to be shared with the developer.

Web correctness validation completed before packaging: 60 unit tests and all 13 Playwright regression suites passed, including the allocation flow at 375/390/430/768/1280px. The APK validation additionally checks for the new advance-payment UI and exact fresh production chunk hashes. Packaging does not publish the separate hosted website.
