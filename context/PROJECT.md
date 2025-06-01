# PROJECT OVERVIEW

> **Repo:** `nuri-passkey-mpc-bitcoin-wallet`
> **Last Updated:** 2025-05-27

---

## 1 ▪ Purpose & Vision
An open-source reference wallet that demonstrates how to use **Privy** SDK to:
1. Authenticate users with **passkeys** (FIDO2 / Face ID / Touch ID / hardware keys).
2. Provision secure **MPC-backed wallets** (initially Ethereum; Bitcoin support WIP).
3. Provide a seamless mobile UX with **Expo Router**.

The end-goal is a production-ready, passkey-first, multi-chain wallet with hardened security (similar security posture to Bitkey & Muun).

---

## 2 ▪ High-Level Architecture
```
┌──────────────────────────────────────────────────────────────────┐
│                       Expo React-Native App                     │
│                                                                  │
│   UI Screens            Context / Hooks          Privy Services   │
│  ────────────        ─────────────────────      ────────────────  │
│  LoginScreen   ◀──┐  usePrivy()                Auth + Session     │
│  UserScreen    ◀──┴─ useLoginWithPasskey()  ─▶  Embedded Wallets   │
│                        useEmbeddedEthereumWallet                 │
│                        useEmbeddedBitcoinWallet                  │
└──────────────────────────────────────────────────────────────────┘
```
Key points:
* **Passkey login** is the primary (and currently the only) auth method.
* After login we ensure the user always has **one Ethereum embedded wallet** (auto-created in v0.0.2).
* Bitcoin wallets are created manually via UI (testnet; requires ETH wallet to exist first).

---

## 3 ▪ Important Files & Directories
| Path | Purpose |
|------|---------|
| `components/LoginScreen.tsx` | Passkey sign-up & login UI |
| `components/UserScreen.tsx` | Wallet management (auto-create ETH, create BTC, sign message) |
| `app/_layout.tsx` | Wraps app in `PrivyProvider` |
| `app.config.js` | Expo / EAS configuration (bundle IDs, associated domains, etc.) |
| `context/RULES.md` | Development rules & workflow guidelines |
| `context/PROJECT.md` | **You are here – project overview** |
| `Issues/Issue-002-Ethereum-Wallet-Auto-Creation.md` | Detailed write-up of latest feature |

---

## 4 ▪ Development Workflow (TL;DR)
1. `git checkout main && git pull`
2. `git checkout -b feature/<task-name>`
3. Implement & test (local + EAS/TestFlight).
4. Merge back to `main` (`--no-ff`) and push.
5. Update Markdown issue file & close GitHub issue.
> Full rules live in **Rule 15** of `context/RULES.md`.

---

## 5 ▪ Current Versions & Key Dependencies
| Package | Version |
|---------|---------|
| expo | 53.0.9 |
| react-native | 0.79.2 |
| @privy-io/expo | 0.53.1 |
| expo-router | 5.0.6 |
| eas-cli (global) | latest |

---

## 6 ▪ Recent Changelog
### v0.0.2-alpha  (2025-05-27)
* **Auto-create Ethereum wallet after passkey login** (`components/UserScreen.tsx`).
* Added basic logging for auto-provisioning flow.
* Updated `context/RULES.md` with **Rule 15 – Standard Git Workflow & Branching Strategy**.
* Documentation: consolidated issue files, created this `PROJECT.md`.
* Successful TestFlight build via `eas build --platform ios --auto-submit --profile production`.

> Previous changes: see `Issues/` folder or Git tags.

---

## 7 ▪ Build & Deploy
1. `npm install` (first-time or after dependency change).
2. Login to Expo: `eas login` (or set `EXPO_TOKEN`).
3. `eas build --platform ios --auto-submit --profile production --non-interactive`.
4. Monitor build on Expo dashboard; TestFlight is auto-uploaded.

---

## 8 ▪ Testing Strategy
* **Manual:** 
  * Passkey login/sign-up on device.
  * Verify ETH wallet auto-exists, then create BTC wallet.
* **Automated:** Jest & Detox planned (see Rules §6) – not yet implemented.

---

## 9 ▪ Roadmap / TODO Snapshot
* Finish Bitcoin wallet transaction flow (sign & broadcast PSBT).
* Integrate hardware-key-only enforcement for critical actions.
* Add automated tests and CI.
* Additional chains (Solana?) – TBD.

---

## 10 ▪ Resources & Docs
* Privy Expo SDK docs: `context/privy-sdk-docs/` (mirrored snippets).
* Expo passkey guide: https://docs.privy.io/authentication/user-authentication/login-methods/passkey
* Security comparison & background: see `README.md`.

---

> End of `PROJECT.md` – keep this file up-to-date when major architectural or workflow changes occur. 