# Issue #005: Send Bitcoin Transaction (Sign & Broadcast)

| Field | Value |
|-------|-------|
| **Status** | TODO |
| **Priority** | P1 |
| **Assignee** | Open |
| **Version Bump on Completion** | No |

---

## 📝 Description
Add a minimal send-BTC flow to `UserScreen.tsx` so a user can transfer sats from their embedded Taproot wallet.

## 🎯 UI Requirements
1. **Amount input** (sats)  
   • Numeric TextInput.  
   • "MAX" button that fills the field with *spendable balance – estimated fee*.
2. **Auto-calculated fee**  
   • Display fee estimate in sats right next to/below amount.  
   • Use Privy SDK fee helper once exposed (`wallet.getProvider().getFeeRate()` is referenced in docs); fall back to hard-coded 10 sat/vB if helper not available.  
   • Re-compute when amount or MAX pressed.
3. **Recipient address field**  
   • TextInput.  
   • "Paste" button to pull from clipboard.  
   • Validate base58/bech32; invalid shows red helper text.
4. **Sign transaction** button  
   • Disabled until valid amount & address.  
   • Calls `provider.signTransaction({ psbt })` per Privy docs.  
   • On success store `signedTxHex` in state and show green check.
5. **Broadcast** button  
   • Disabled until a signed tx exists.  
   • POST `signedTxHex` to mempool.space API: `POST https://mempool.space/api/tx` (returns txid).  
   • On success show txid as link to `https://mempool.space/tx/<TXID>`.
6. **Visual states**  
   • Loading spinners or `Loading…` text for sign/broadcast.  
   • Error messages surfaced in the blue `feedback` area.

## 🔗 Dependencies
* Embedded Bitcoin wallet must exist.  
* No backend required (broadcast via public API).

## 📂 Touches Areas
* `components/UserScreen.tsx` (extend existing Bitcoin wallet section)

## 🔨 Implementation Sub-Tasks
1. **Form state hooks** (`amount`, `recipient`, `signedTxHex`, `feeEstimate`, `errors`).
2. **Fee estimation helper**  
   a. If `provider.getFeeRate()` exists, call it.  
   b. Else fetch `https://mempool.space/api/v1/fees/recommended` and use `halfHourFee`.  
   c. Compute fee = feeRate × 110 vB (1-input 2-output rough size).
3. **MAX logic**: `(balance - fee) ≥ 0 ? populate : error "Insufficient funds.".`
4. **Address validation**: use `bitcoinjs-lib`'s `address.toOutputScript` or regex; minimal dependency preferred.
5. **Sign**: build PSBT with `@scure/btc-signer`, call `provider.signTransaction`. Store hex.
6. **Broadcast**: POST hex, get txid.
7. **Error handling**: wrap each async step try/catch → setFeedback.

## ✅ Acceptance Criteria
- [ ] Form renders with amount, MAX, fee, address, paste.  
- [ ] Invalid address or amount disables "Sign".  
- [ ] After signing, "Broadcast" enabled and uploads successfully (returns txid).  
- [ ] Links open mempool.space in browser.  
- [ ] All states (loading/success/error) visible without console.

## 🧪 Testing Steps
1. Fund wallet (Faucet).  
2. Enter partial amount → fee shows.  
3. Hit MAX → amount adjusts.  
4. Paste a valid address → Sign → Broadcast.  
5. Confirm in explorer page opens.  
6. Try invalid address → Sign disabled & error message.

---

> Keep implementation self-contained; no navigation changes or additional libraries unless absolutely necessary. 