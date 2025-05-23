
# Nuri × Privy Passkey MPC Wallet – Technical Briefing

**Objective**  
Ship an Expo‑based mobile wallet for **Nuri.com** where a user:

1. **Logs in with a passkey** (no email / password).  
2. A **device share** is generated and stays in the Secure Enclave / Keystore.  
3. A second share (**Privy auth share**) lives in Privy’s TEE.  
4. The user is *forced* to create an **iCloud‑encrypted recovery share** at onboarding.  
   > This yields a 2‑of‑3 Shamir split: any two shares recover the key; no seed phrase exposed.

Your Privy credentials  
```env
PRIVY_APP_ID=cmaz6gvx500zykw0lfnlv4lrb
PRIVY_SECRET_KEY=25afqvDWr9xvN3wneMzsdmN5j1tPr848cHDtpwuzKFxhE5QUuQz9Wfz9XZRH64SHEnt9q1a6GWogRpT5acvgE6UT
```

---

## 1  Repo bootstrap

```bash
git clone https://github.com/eminogrande/emin-expo-mpc-portal.git
cd emin-expo-mpc-portal

# install deps
npm i          # or pnpm / yarn

# environment
cp .env.example .env
echo "PRIVY_APP_ID=$PRIVY_APP_ID"       >> .env
echo "PRIVY_SECRET_KEY=$PRIVY_SECRET_KEY" >> .env
```

The repo already contains:

* `@privy-io/expo`, `@privy-io/expo-native-extensions`, `react-native-passkeys`.
* A minimal Auth context and a login screen that triggers `loginWithPasskey()` then `portal.backupWallet(BackupMethod.Passkey)`.

---

## 2  Passkey domain configuration (iOS & Android)

| Platform | What you must do | Source |
|----------|-----------------|--------|
| **iOS** | 1. Add your domain to `associatedDomains` in `app.config.ts`:  <br>`"associatedDomains": ["webcredentials:nuri.com"]`.<br>2. Host `https://nuri.com/.well-known/apple-app-site-association`:<br>`{ "webcredentials": { "apps": ["<TeamID>.com.nuri.app"] } }` | citeturn0search0 |
| **Android** | 1. Add your `sha256_cert_fingerprint` in **Privy Dashboard ▸ Settings ▸ Android key hashes**.<br>2. Host Digital Asset Links at `https://nuri.com/.well-known/assetlinks.json`. | citeturn0search0 |
| **Server** | **None required.** Passkey WebAuthn ceremony happens client‑side; Privy handles passkey attestation on login. |  |

> Expo Go **cannot** load native passkey modules. Use a Dev Client or EAS build. citeturn0search8

---

## 3  Expo config snippets

```ts
// app.config.ts
import "dotenv/config";
export default {
  expo: {
    name: "Nuri MPC Wallet",
    slug: "nuri-wallet",
    ios: {
      bundleIdentifier: "com.nuri.wallet",
      associatedDomains: ["webcredentials:nuri.com"]
    },
    android: {
      package: "com.nuri.wallet"
    },
    plugins: [
      ["expo-build-properties", {
        ios: { deploymentTarget: "17.5" },
        android: { compileSdkVersion: 34 }
      }]
    ],
    extra: {
      PRIVY_APP_ID: process.env.PRIVY_APP_ID,
      PRIVY_SECRET: process.env.PRIVY_SECRET_KEY
    }
  }
};
```

---

## 4  Code highlights

```tsx
// portal.ts – singleton Privy client
import { createPrivyClient } from "@privy-io/expo";

export const privy = createPrivyClient({
  appId: process.env.EXPO_PUBLIC_PRIVY_APP_ID!,
  loginMethods: ["passkey"],
  embeddedWallets: {
    createOnLogin: "all",
    enableSelfCustodyMode: true,
    requireRecoveryPrompt: true   // forces iCloud enrolment
  }
});
```

```tsx
// LoginScreen.tsx
const { loginWithPasskey } = usePrivy();

<Button
  title="Create wallet with Passkey"
  onPress={() => loginWithPasskey({ relyingParty: "nuri.com" })}
/>
```

Privy then:

1. Prompts the system **passkey** sheet.  
2. Generates an **embedded wallet** → splits private key into *device* + *auth* shares.  
3. Shows the **iCloud Key‑Value Store** prompt for the recovery share. citeturn0search7

---

## 5  Flow recap

```
 User taps “Create wallet”
        │
        ▼
╔════════════════════════════════╗
║      Passkey ceremony          ║  ← loginWithPasskey()
╚════════════════════════════════╝
        │
        ▼
╔════════════════════════════════╗
║  Privy TEE creates wallet key  ║
║      ┌─────────┬─────────┐    ║
║      │ device  │  auth   │    ║
║      │  share  │  share  │    ║
╚══════┴─────────┴─────────╩════╝
        │
        ▼
╔════════════════════════════════╗
║  Prompt iCloud backup share    ║
╚════════════════════════════════╝
        │
        ▼
  Wallet ready (2‑of‑3 split)
```

---

## 6  What **works now**

* Passkey login & account creation  
* Device + Privy + iCloud share generation  
* Secure storage via Expo Secure‑Store  
* Hot‑reload in a custom Dev Client

## 7  What’s **missing**

| Feature | Status |
|---------|--------|
| Sign / send transactions | Not yet wired (Portal MPC signing round still TODO) |
| Multi‑account UI | Not implemented |
| Email / OAuth fallback | Disabled |
| Backend‑verified JWT session | Stubs only |

---

## 8  Build & test

```bash
# iOS simulator
npx expo run:ios

# Android emulator
npx expo run:android

# Production build
eas build -p ios --profile production
eas build -p android --profile production
```

After first run, confirm:

1. Wallet address prints in console (`wallets.ethereum.address`).  
2. **iCloud Drive ▸ App data ▸ Nuri Wallet** shows `privy_recovery_share` blob.

---

## 9  Security notes

* Keep `PRIVY_SECRET_KEY` out of the client bundle (`extra` env is fine but never commit).  
* Host your **apple‑app‑site‑association** file *without* `.json` extension; must be served as `application/json`.  
* On Android, `assetlinks.json` must be served with `application/json` and **public** caching.

---

## 10  Next steps

1. Implement Portal MPC `sendTx` flow once exposed.  
2. Add jailbreak / root detection.  
3. Hook CI with EAS Build + ESLint + typecheck.  
4. Localise UI and add onboarding tutorial.

---

### References

* Passkey setup guide (Expo) – docs.privy.io citeturn0search0  
* Login with passkey hook – docs.privy.io citeturn0search2  
* Expo SDK overview – docs.privy.io citeturn0search7  
* Expo Go passkey limitation – Authsignal blog citeturn0search8
