# Clearpath targeted correctness pass

## A. Expense payments

The previous form exposed actual bill and payment fields only for variable expenses, without an explicit final-versus-partial choice. A fixed expense still used its budget as the only obligation, and the payment notification always said “marked paid” even for a partial payment.

The existing Radix Radio Group and shared form now distinguish “This is my final actual amount” from “This is only a partial payment” for all expense types. Final mode stores the explicitly entered actual in the existing `actuals[YYYY-MM]` map and allows a separate payment amount. Partial mode changes only the payment ledger, never the obligation. The existing `getExpenseObligation` remains the single source for actual-or-budget, checklist completion, guards and totals. Future recurring budgets are unchanged. Invalid payments leave both actuals and transactions unchanged and keep the form open for correction. Undo removes the payment, not an explicitly confirmed actual bill.

## B. Debt start month

Previously, `debtPlanForMonth` applied a fixed debt's default minimum to every month; there was no stored first-payment month or shared gate. Creation date and the month in which the form was opened could not establish when a payment was due.

New debts save `firstPaymentMonth` from the existing debt form. `getDebtFirstPaymentMonth` also reads supported `startMonth` / `paymentStartDate` aliases. `debtPlanForMonth` returns zero required/planned amounts before the configured month, before considering defaults or overrides. Checklist, totals, buffer/shortfall, Smart Plan order, selected-month dues and forecast already consume this helper. Principal remains a real debt before its first due; interest estimates are not silently waived. Editing cannot move the first month beyond an actual recorded payment or a positive scheduled due.

Legacy debts without any stored first-payment information keep previous behavior. Their start cannot be guessed from creation dates or account names; the user can set it explicitly in Edit debt. There is no blanket migration. Debt payments remain strict: below the monthly minimum is Partial, unless the finite debt was actually cleared in that month. Earlier unpaid months are not retroactively marked paid by a later payoff.

## C. Variable BNPL progress

The previous code immediately returned unavailable when `getOriginalStartingBalance` returned null for variable BNPL. It never checked whether the retained schedule and actual ledger could reconstruct tracked liability. That code-path cause is verified; the user's actual physical-phone Lazada record was not supplied and its individual cause/numbers cannot be certified.

For missing snapshots, the read-only fallback requires valid unique schedule months, actual payments covered by retained schedule months, no unresolved reconciliation adjustment, valid pending charges, and exact cent-level agreement between full schedule + pending charges − recorded payments and canonical actual remaining liability. Missing rows, unpaid historical dues, mismatches and incomplete history remain unavailable. Charges already incorporated into dues are not added from the activity ledger again; unreconciled charges enter once. Existing original snapshots remain authoritative and immutable.

No snapshot self-repair or balance migration is performed. Changing the selected future month does not change actual progress: analytics still use the real current month; the forecast remains separate.

Acceptance fixture only (NOT the user's Lazada data): original snapshot null; full retained schedule ₱23,162.88; October payment ₱5,012.43; current remaining ₱18,150.45; tracked ₱23,162.88; cleared ₱5,012.43; progress approximately 21.64% (21.6% displayed). Actual phone original, schedule, remaining, October payment, tracked, cleared and percentage: **NOT TESTED / not available**. The user declined exporting their phone plan, and no further backup was requested.

## D. Notifications

The shadcn registry's Sonner pattern provides one `AppToast` wrapper. All existing notification state routes through it, including payments, add/delete/archive, expense deletion, export/restore success and errors. Explicit success/error/info variants use subtle green/rose/cream surfaces with navy-compatible text, consistent typography, padding, icon slots and an inline Undo. Sonner provides announcement, keyboard/focus and dismissal behavior; no duplicate notification primitive is built.

Toasts are centered, width-capped, with fixed side margins; mobile bottom offset is tab-bar height + safe area + 12px. The dismiss button is always centered vertically at the trailing edge. A responsive library-style override discovered by Playwright was corrected. The old black-bar markup is no longer rendered.

## E. Safety and verification

No changes to backup format/parser, localStorage key, restore mechanics, Android package, signing key, version, wrapper or update process. No actual user records were merged, deleted, imported, or migrated for this task. Existing v1.3 APK remains unchanged; this pass does not relabel that older binary as a new build. Production dependencies audit reports zero vulnerabilities; unrelated development dependency findings were not auto-fixed.

Tests: `tests/correctness.test.mjs` covers canonical start gates, legacy aliases, forecast/allocation, unchanged backup compatibility, read-only BNPL reconstruction, missing/duplicate/unpaid history, scheduled/pending charges and round-trip progress. `tests/playwright-correctness.mjs` covers actual UI creation/payment flows, required amounts, all three expense types, actual-versus-future progress, success/error/info/Undo notifications, dismiss, saved record equality and 375/390/430/768/1280px. Existing payment tests explicitly cancel rejected payment forms before their next interaction. All existing regression suites remain in `npm run test:e2e` with the new suite appended.

## F. APK gate

**BLOCKED for a new final APK:** the exact physical-phone Lazada scenario remains unverified without its persisted record, and the brief explicitly requires that scenario before a final build. Generic reconstruction acceptance tests are not substituted for actual-phone evidence. Preserve the already-working v1.3 backup/update setup; do not build or publish a misleading replacement. Final chat reports completed test/deployment results and any remaining limitations.
