# Revolving accounts at zero — October 15, 2026

Credit Card, Revolving Credit, Revolving Credit / Credit Line, Credit Line, Wallet/App Revolving Credit, and records explicitly modeled with `revolving: true` stay Active when paid down to zero. Ordinary Other Loan records are not inferred to be revolving. No new category editor or finance framework was introduced.

## Business rules

- Both payment recording and background auto-completion use the same finite-loan completion predicate. Finite loans and fixed BNPL keep their previous completion behavior.
- Zero-balance revolving accounts retain their saved minimum-payment configuration for future borrowing, but their effective current-month obligation is zero unless a real month-specific statement due is stored. No phantom checklist row or payment-budget contribution is generated from a default minimum.
- Historical configured dues and finite-loan paid-current-month checklist rows are intentionally unchanged. Future forecasts continue using the existing engine.
- Open accounts remain counted in Active, contribute zero to current balances/donut at zero, and are not counted as permanently completed debts. Reliable progress says current balance cleared; unknown starting history remains unavailable.
- Utilization supports revolving accounts with a recorded limit. New purchase/borrowing uses the existing canonical balance and transaction flow, restarting normal planning.
- The debt menu offers Close / archive account. It is disabled with an outstanding balance, and the handler also validates the current balance. A shared accessible Alert Dialog confirms archive. Archive preserves the debt record, payment settings, monthly schedules and every transaction, including accounts with no activity.

## Saved-data compatibility

Existing active-zero and archived revolving states survive reload and backup/restore. The existing idempotent migration also repairs legacy revolving `completed` states produced by the previous automatic-completion rule: it reopens them and removes their misleading completion date. Explicit `archived` states and finite-loan completion are never reopened. No balance, starting snapshot, transaction or history is rewritten. No schema-version bump is required for this status correction.

## Tests

`tests/revolving.test.mjs` covers classification, zero-obligation defaults, genuine statement overrides, historical dues, progress/counts, finite completion and idempotent restore/status correction.

`tests/playwright-revolving.mjs` exercises the requested ₱3,905.48 payoff and ₱30,000 limit, next-month ₱1,500 borrowing (5% utilization), canonical progress recalculation, resumed planning, archive guard/cancel/confirmation, preserved Activity, finite-loan completion and active/archived backup restoration. Confirmation layout is checked at 375/390/430/768/1280px. Test fixtures use isolated browser storage, not the user's stored finances.

Other existing payment, income, expense, BNPL, chart and mobile regressions remain part of the standard browser test command. The new test is included in `npm run test:e2e`.

## Changed files for this fix

- `lib/planner-logic.mjs`: revolving classification, finite completion predicate, effective zero dues and saved-status repair.
- `app/planner.tsx`: completion callers, guarded archive action, truthful payoff/progress wording and utilization.
- `app/ui.tsx`: optional controlled state/action label on the existing shared confirmation component; old callers keep their defaults.
- `app/debt-visuals.tsx`: zero-balance open-account wording, without changing chart/progress calculations.
- `tests/revolving.test.mjs`, `tests/playwright-revolving.mjs`, `package.json`, this report.

No APK was rebuilt or release asset replaced during this focused rule change. The published v1.2 APK still contains the previous bundled code and needs a separate rebuild to receive this fix.
