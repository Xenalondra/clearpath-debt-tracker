# Clearpath final stabilization and safe Android update

## Scope and data safety

This pass fixes variable-expense actual obligations and hardens backup/restore and the existing Android wrapper. It does not replace the framework or change debt/BNPL balances, payoff formulas, transaction history or chart calculations.

The user clarified that the records to preserve are in the existing Android app, not the browser profile. **Do not restore the separately exported browser plan over Android records.** Existing Android storage is retained on upgrade. Import onboarding is only for an empty first-launch planner; it does not replace an existing plan. No phone/PWA data is cleared or uninstalled.

Private baseline backups, equality reports and screenshots are kept under ignored `work/`, outside source, deployment archives and APK assets. The actual physical phone is not connected: emulator upgrade and restore tests cannot certify its individual records or backup status.

## A. Variable expense fix

Previously, checklist, totals and payment validation read the global expense actual/amount while Pay Different Amount recorded only a transaction. A payment for a smaller actual bill therefore left the budget remainder unpaid.

`getExpenseObligation(expense, month)` now supplies one value to the checklist, Paid/Partial state, remaining amount, expense guard, monthly totals and safe-to-allocate/shortfall planning. Explicit `actuals[YYYY-MM]` takes precedence over the expected budget, including zero and amounts above budget. The variable payment form separates Actual bill amount and Amount paying now. Payment validation happens before either actuals or transactions change.

Actual bills are stored on the expense by month. Dated budget versions preserve earlier expected amounts when a recurring budget changes. Legacy actuals are anchored to their existing month/effective date, or the migration month if no date was stored; the migration is idempotent. No existing payments are deleted or relabeled.

The reported extra ₱809.01 transaction is not automatically removed. If the original Undo is still available it is the existing reversal mechanism. Otherwise, export a backup and review that exact transaction before an explicitly approved correction; do not uninstall, clear data, guess a new bill amount or restore an unrelated/older whole plan as a shortcut.

## B. BNPL progress

The canonical progress helper is unchanged. With a reliable immutable original amount of ₱23,162.88 and remaining balance ₱18,150.45, the test gives ₱5,012.43 cleared and approximately 21.64% progress (21.6% displayed). This is an acceptance-test example, not a claim about the user's actual Lazada account.

The accessible browser safety copy had no Lazada record; the physical Android plan was not accessible. Actual Lazada tracked/remaining/cleared/progress values are therefore NOT TESTED. Missing original history remains Progress unavailable rather than a fabricated percentage. No guessed starting snapshot or BNPL balance migration was introduced.

## C. Expense delete

Browser deletion already uses a confirmation and month-based archival. The old Android WebView did not implement JavaScript confirmations; adding WebChromeClient confirmation support makes that existing flow usable there. Previous transactions remain in Activity and previous months, while current/future obligations are removed through the existing inactiveFrom rule.

## D. Backup and restore

- Export format: `{app:"Clearpath", schemaVersion:1, exportedAt, data}`. Legacy plain Clearpath backups remain accepted.
- Export includes all supported persisted debts, schedules, transactions, income, expenses, monthly actuals, budget versions, lifecycle fields and settings.
- Browser export creates a real JSON download and reports its filename and that download was initiated, without claiming an unknown final filesystem location.
- Android uses the system Create Document save picker. Success is reported only after writing the selected URI; the displayed filename comes from the document provider. Optional sharing opens the system chooser. Nothing is shared automatically.
- Restore reads, parses and validates before showing date/counts and replacement confirmation. Cancel/invalid files leave state intact. The complete replacement is persisted before updating the shared React state, so all routes refresh without manual reload. Storage failures are surfaced.
- Unknown legacy activity labels are preserved unchanged, not converted into invented payments.
- Empty Android first launch has Restore backup and Start fresh actions, with no seeded financial records.

## E. Preservation gate

The existing hosted export was validated and restored into fresh browser contexts. After the user clarified the source is Android, a separate read-only copy of the emulator's installed v1.2 plan was captured and also restored into clean contexts. Exact serialized records and summary metrics were compared. JavaScript-only undefined properties are not JSON records and are normalized through JSON serialization for equality checks.

The private gate compares income count/total, expense count/month obligation, Active/Completed counts, current debt, variable BNPL schedule rows, transactions, buffer, strategy, text size and due-soon threshold. `android-wrapper/check-data-gate.mjs` refuses APK packaging without a passing equal-records/equal-totals proof and valid safety copies.

For the real phone, the intended path is **install as Update with the same application ID/signing certificate, verify the existing records, then export a backup from the updated app**. Never uninstall to work around an installation error. If Android requests uninstall or reports a signing mismatch, stop and retain the installed app/data.

## F–H. Production and Android

The production web build is deployed through the existing Sites workflow. Android retains `io.clearpath.app`, the Clearpath icon, HTTPS storage origin and existing debug signing key. Version 1.3 / code 4 is an installable debug/test APK, not a production-signed Play Store release. The sequence is fresh production web build, route/asset capture, data gate, Android compilation/signing and asset/source checksum validation.

The final chat report provides actual deployment/download URLs, build result, artifact metadata and test outcomes. No actual user plan is bundled into the APK or uploaded as a release asset.

## I. Files and limits

Shared logic: `lib/expense-logic.mjs`, `lib/backup.mjs`, `lib/planner-summary.mjs`. UI integration: `app/planner.tsx`. Native file/confirmation support: existing `android-wrapper/java/io/clearpath/app/MainActivity.java`. Packaging: manifest/version, existing build/validator and data-gate script. Unit and browser tests cover expense cases A–G, corrupt/legacy backups, round-trip proof, mobile layouts and existing regressions; native smoke tests cover update preservation and system import/export.

Native file locations vary by document provider. Physical-phone backup status, actual phone record counts and actual Lazada history cannot be verified without that device or its backup. Existing historical mistakes are deliberately not silently repaired. Keep the existing app installed and export a fresh backup after verifying the update.
