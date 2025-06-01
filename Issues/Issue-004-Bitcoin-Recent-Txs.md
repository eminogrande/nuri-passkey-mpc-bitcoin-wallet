# Issue #004: Show Recent Bitcoin Transactions & Confirmation Status

| Field | Value |
|-------|-------|
| **Status** | TODO |
| **Priority** | P2 |
| **Assignee** | Open |
| **Version Bump on Completion** | No |

---

## 📝 Description
Enhance the Bitcoin wallet section to give users immediate insight into incoming/outgoing activity:
* Display the **latest ≤3 transactions** for the embedded Bitcoin Taproot address.
* Show whether each transaction is **confirmed** (≥1 block) or **unconfirmed** (mempool).
* Provide a tappable link on each transaction hash that opens the transaction in a browser at the **mempool.space** explorer.
* Provide a link (button) to view the **full address** on mempool.space for additional history.

## 🎯 Objective
A user who just received bitcoin sees the pending transaction appear within seconds (unconfirmed) and can tap to view it in the explorer.

## 🔗 Dependencies
None blocking; uses existing wallet address from `account.address`.

## 📂 Touches Areas
* `components/UserScreen.tsx` only.

## 🔨 Implementation Sub-Tasks
1. **Fetch recent txs**
   * Use mempool.space API: `https://mempool.space/api/address/<ADDR>/txs` (returns newest first, 25 max).
   * Request every time the user presses a new **"Refresh"** button (reuse the balance refresh or combine).
   * Parse first three entries → `txid`, `status.confirmed`, `status.block_time`.
2. **Render list**
   * Under the balance line, render up to three rows:
     `• <short-txid> – Confirmed / Unconfirmed`
   * `short-txid` = first 6 + "…" + last 6 chars.
3. **Explorer deep-link**
   * Each row is a `TouchableOpacity`; `onPress` opens `https://mempool.space/tx/<TXID>` via `Linking.openURL`.
   * Add a small "View all" link below list → `https://mempool.space/address/<ADDR>`.
4. **Error handling & visual state**
   * Show `Loading…`, list, or `Error` similar to balance fetch.
   * No crashes on network failure.
5. **No xpub yet**
   * Privy SDK does not expose xpub; stick to single address for now. Add note in code comment.

## ✅ Acceptance Criteria
- [ ] Up to three latest txs with confirmed/unconfirmed status render below balance.
- [ ] Tapping a txid opens mempool.space tx page.
- [ ] "View all" link opens mempool.space address page.
- [ ] Visual loading/error states present.
- [ ] No other files modified.

## 🧪 Testing Steps
1. Fund the wallet with test satoshis; observe new unconfirmed tx appears within ~30 s after refresh.
2. After confirmation, refresh again → status switches to Confirmed.
3. Tap txid → explorer opens.
4. Tap "View all" → address page opens.

---

> Keep scope minimal: one fetch call, no pagination, no xpub derivation. Leave advanced history or pagination to future tasks. 