# Clearpath mobile design system

This UI-only pass preserves planner state, transaction handlers, saved-data migration, BNPL dues, forecasts, progress formulas, and completed-debt behavior. No APK was built.

## Shared system

`app/design-system.css` defines colors (cream surfaces, navy text, violet actions, semantic status colors and existing pastel accents), a 4px spacing rhythm, page/card/modal padding, button/input/card/sheet radii, serif display and section typography, sans-serif UI typography, and 44/46/50px control sizes. Existing CSS aliases consume these shared tokens. Numeric input parsing and validation are unchanged; new amount fields remain empty, with the existing placeholder hint.

`PageHeader` is reused on Dashboard, Debts, Expenses, Activity and Settings. `FormShell` reuses the existing Radix Dialog and established debt-form layout for income/debt/expense create and edit, record activity, different payment and reconcile forms. A stable header and footer surround a scrollable body. Primary labels are Add income/Save income, Add debt/Save debt and Add expense/Save expense. Cancel is always present. Existing Radix menus, confirmation primitives, tabs and radio groups are reused rather than duplicated.

Mobile navigation uses Lucide House, WalletCards, ReceiptText and History icons at 24px with 12px labels below, equal-width tabs and a restrained active treatment. Settings remains reachable from the header. Month navigation retains its existing date input and handlers in a single 44px control row.

## Safe areas

The shell, tab bar, toasts and form footer account for top/bottom safe-area insets. No arbitrary top spacer was added. Vinext currently omits viewportFit when serializing its viewport export, so the shared UI normalizes the existing viewport meta tag to `width=device-width, initial-scale=1, viewport-fit=cover` on mount without restricting zoom. The declaration remains in the layout for compatible runtimes. Existing native Android insets are unchanged.

## Branding

The original Clearpath mark is a violet C/progress arc and cream check on navy. `public/favicon.svg` is the source; `scripts/generate-icons.mjs` exports 192/512px PNGs, a maskable PNG and Apple touch icon. The PWA references these assets and is named Clearpath.

Android keeps application ID `io.clearpath.app`, version 1.1/code 2, and label Clearpath. Adaptive launcher resources for API 26+ include background/foreground layers, plus a monochrome layer for API 33+. The mark stays within Android's adaptive-icon safe zone. The resources were compiled for validation only, not linked or packaged as an APK.

## Reference review

The configured shadcn registry's Dialog, Button, Input and Dropdown Menu patterns were inspected and the existing Radix primitives retained. [Lucide's React documentation](https://lucide.dev/guide/react) informed consistent SVG icon usage. [Android's adaptive icon documentation](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive) informed resource structure and safe-zone sizing. [21st.dev's component catalogue](https://21st.dev/community/components) was reviewed as a pattern reference, not copied. Mobbin's detailed screens were inaccessible through the browsing tool; the mobile conventions in the user brief guided hierarchy and navigation proportions.

## Verification and limits

Playwright checks cover 375/390/430px mobile and 768/1280px tablet/desktop: all five pages, matching header top offsets, icon/label geometry and readable sizes, all six create/edit forms plus activity/payment/reconcile forms, visible Cancel/primary actions, 24-month BNPL form scrolling, blank new numeric inputs, overflow and saved-record invariance. CSS inset-bearing layout is simulated; no new Android APK or physical-device certification is claimed. PWA icon URLs and viewport metadata are checked. Screenshots use isolated test fixtures, not user records.

Existing native browser confirmations for income/expense deletion remain intentionally unchanged. Dependency installation reported 30 audit advisories; dependency remediation is outside this visual pass and was not attempted.
