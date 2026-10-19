# Portfolio progress and advance-payment allocation

## Portfolio scope

The former aggregate required every non-archived debt to have a known percentage. It now sums only entries with a reliable positive tracked amount and finite reduced/percentage values (`isReliable`). Remaining balance and donut slices still include every Active balance. Completed debts retain their previous participation in portfolio progress; archived records remain outside the portfolio.

The aggregate is reliable reduced / reliable tracked, not an average of percentages. If none are reliable, progress stays unavailable. The shared disclosure on Debt Overview and the Dashboard progress card gives reliable/total counts, excluded names and the reason for exclusion. Restoring reliable history automatically includes that debt on recalculation; no stored financial records are changed by analytics.

QA exclusion: **Legacy BNPL Fixture**, a deliberately synthetic debt with no original snapshot and no reconstructible payment history. A second test restores a reliable snapshot and confirms automatic inclusion. The accessible hosted browser view did not reproduce the reported mixed-history case; the user's physical-phone dataset was not accessed or exported, so no claim is made about its individual excluded account names.

## Canonical allocation

New debt payment records contain:

- `transactionDate`: actual cash date, no later than today.
- `appliedMonth`: the obligation month.
- `date`: compatibility alias equal to transactionDate, so older Activity readers do not invent a future cash date.

Legacy records are not rewritten: absent transactionDate falls back to date; absent appliedMonth falls back to that actual date's month. The existing transaction ledger remains the source of truth. There is no second payment/checklist balance state.

Shared helpers distinguish actual cash/balance credit, paid amount allocated to an obligation, early allocations and actual-month advance cash outflow. Forecasts begin from the already reduced actual balance and subtract only the *unpaid* part of later obligations. Finite balances are not reduced twice. BNPL carry separates legacy unallocated excess from explicit future allocations, so an earlier unpaid schedule row or another future month cannot consume the advance's earmarked credit.

Advance cash contributes to Debt Payments and safe-to-allocate/shortfall in the month it left. The future month's protected allocation excludes amounts already paid in advance. Ordinary same-month payment budgeting retains its prior behavior. Existing monthly APR estimates remain estimates, not newly invented daily lender-interest calculations.

The existing BNPL convention for historical scheduled rows is retained; this pass does not introduce an arrears/re-aging model or reinterpret older unpaid schedule rows. The new allocation credit is earmarked independently of those rows. Plans with historical arrears need lender reconciliation through the existing workflow, not guessed retroactive repayments.

## Interaction and lifecycle

Future debt checkboxes open the shared advance form; they never post directly or create a selected-month-dated transaction. The form shows the obligation month and actual payment date. Future actions are Pay in advance, Pay different amount in advance and Pay in full. Partial allocations stay Partial until the required amount is met or the actual debt is cleared. Fully prepaid obligations show Paid in advance and cannot be recorded again through the monthly-pay action. Full payoff remains a distinct guarded action.

Current-month normal actions continue to work. Past-month checklist actions remain disabled; existing explicitly dated/backdated-entry behavior is not expanded into arbitrary past-month checklist posting. Future expenses remain view-only. Finite payoff completes the debt; zero-balance revolving accounts remain Active and retain their utilization/history rules. A prepaid target-month receipt stays visible even if a finite debt was fully cleared early, while later unallocated obligations stop.

Activity groups by actual cash date and discloses the applied obligation month. Undo removes the single real payment/allocation and restores the prior balance. Overpayment and duplicate-action guards run before mutation. Menu layering was adjusted so a notification cannot intercept future menu actions.

## Data and compatibility

The same localStorage key and existing backup envelope are retained. Both metadata fields survive export/restore unchanged. Restore validates optional dates/months and rejects conflicting date aliases atomically; old backups remain accepted. No historical dates, records, starting snapshots, schedules, category identities or signing/update configuration are migrated or replaced. Use an allocation-aware Clearpath client when importing these new payments; older APKs do not understand the new obligation allocation semantics even if they retain extra JSON fields.

## Verification and publishing

Final local results: production build PASS; TypeScript (`tsc --noEmit`) PASS; all 60 unit tests PASS; all 13 Playwright regression suites PASS. The new allocation suite passed at 375, 390, 430, 768 and 1280px. `git diff --check` passed. Tests used isolated browser contexts and did not alter the user's hosted or Android plan.

Unit coverage includes mixed/all-unknown/automatically recovered portfolio history, legacy date fallback, full/partial advances, strict obligations despite forecast payoff, cross-month BNPL credit, mixed legacy credit, actual-month cash budgeting, finite completion receipts and backup round-trip/rejection.

The new Playwright suite exercises 375/390/430/768/1280px with disposable isolated fixtures, including actual October 20 cash against November 2026, checkbox confirmation/cancel, duplicate prevention, Undo, Activity date versus obligation month, restore, full payoff, revolving zero balance, and November rollover. Existing regressions remain in the default test script.

Deployment is not claimed: the approval reviewer blocked the official Sites credential-to-helper handoff. No alternate credential-transfer route or UI deployment workaround was used. Implementation and local QA can complete independently; explicit approval/guidance is required before retrying that publishing handoff. No new APK is built as part of this task.
