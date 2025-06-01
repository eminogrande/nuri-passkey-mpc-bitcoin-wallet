# Issue #003: Display Bitcoin Balance in UserScreen (Testnet)

| Field | Value |
|-------|-------|
| **Status** | TODO |
| **Priority** | P2 (small enhancement) |
| **Assignee** | Open |
| **Version Bump on Completion** | No |

---

## 📝 Description
After a Bitcoin testnet wallet is created, the app currently shows the wallet address but not its balance. Displaying the balance will improve user feedback while testing.

## 🎯 Objective
Show the current **Bitcoin testnet balance** of the first embedded Bitcoin wallet directly beneath the address on `UserScreen.tsx`.

## 🔗 Dependencies
* Requires a Bitcoin wallet to exist (created via the existing “Create Bitcoin Wallet (Testnet)” button).
* No other tasks blocking.

## 📂 Touches Areas
* `components/UserScreen.tsx` (only)

## 🔨 Implementation Sub-Tasks
1. **Fetch balance**
   * When `account?.address` is available, perform a lightweight HTTP GET to a public testnet explorer API.
   * Suggested endpoint (no API key required):
     `https://blockstream.info/testnet/api/address/<ADDRESS>` → returns JSON with `chain_stats.funded_txo_sum` and `chain_stats.spent_txo_sum` (sats).
   * Balance (sats) = `funded_txo_sum - spent_txo_sum`.
2. **Display balance**
   * Under the existing address text, render: `Balance: <balance> sats` (or `Loading…` while fetching).
3. **No side effects**
   * Do **not** modify any other logic, hooks, wallets, or UI elements.
   * Keep new code self-contained inside `UserScreen.tsx`.

## ✅ Acceptance Criteria
- [ ] When a Bitcoin wallet address is present, the balance in satoshis appears below it.
- [ ] If the fetch fails, show `Balance: N/A` and log the error (console only).
- [ ] No other files are changed.
- [ ] Manual test on device/TestFlight passes.

## 🧪 Testing Steps
1. Create or open an existing Bitcoin testnet wallet.
2. Observe “Balance: … sats” below the address.
3. Send a small amount of testnet BTC to the address, wait for confirmation, relaunch the app → balance updates accordingly.

---

> Keep the implementation minimal—no extra state management libraries, no caching, no styling overhaul. Simply fetch once on component mount (or when address changes) and display. 