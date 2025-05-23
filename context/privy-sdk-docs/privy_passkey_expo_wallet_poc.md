
# Privy Passkey Expo Wallet – Minimal Proof-of-Concept Guide

## 1. Goal

Build a React Native (Expo) wallet demo that

* onboards **with passkeys only** (WebAuthn / platform biometrics)  
* spins up a **self-custodial embedded wallet** via Privy (2-of-3 Shamir split: device share, Privy auth share, iCloud recovery share)  
* **forces iCloud-encrypted recovery** enrolment right after the wallet is created  
* shows the wallet address on screen with the smallest possible codebase  

---

## 2. Architecture Recap

```
            ┌────────────────────────┐
            │      Privy TEE         │
            │  stores *Auth share*   │
            └─────────┬──────────────┘
                      ▼
  ┌────────────── 2-of-3 Shamir split ───────────────┐
  │                                                  │
  │  📱 Device share (secure enclave / keystore)     │
  │  ☁️ Recovery share (AES-encrypted in iCloud)      │
  │  🔑 Auth share (inside Privy’s TEE)               │
  └───────────────────────────────────────────────────┘
```

Any **two** shares can reconstruct the key, so the user stays in control even if Privy’s servers disappear (device + recovery) or they lose their phone (recovery + auth). *No seed phrase* is ever shown—recovery lives in iCloud.

---

## 3. Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 |
| Expo CLI | `npm i -g expo-cli` |
| Xcode / Android Studio | latest stable |
| Privy App ID | copy from your Privy dashboard |

---

## 4. Create the project

```bash
expo init privy-passkey-poc --template tabs
cd privy-passkey-poc
```

---

## 5. Install Privy & peers

```bash
# Core SDK + native extensions for iCloud backup
npx expo install   @privy-io/expo   @privy-io/expo-native-extensions   expo-apple-authentication expo-application expo-crypto   expo-linking expo-secure-store expo-web-browser   react-native-passkeys react-native-webview

# Polyfills required by ethers & shims
npm i fast-text-encoding react-native-get-random-values @ethersproject/shims
```

If you also need Solana support:

```bash
npm i buffer
```

---

## 6. Polyfill entry-point

Create **\`entrypoint.js\`** in the project root:

```js
import 'fast-text-encoding';
import 'react-native-get-random-values';
import '@ethersproject/shims';

import 'expo-router/entry';
```

Update **\`package.json\`**:

```jsonc
{
  "main": "entrypoint.js",
  "name": "privy-passkey-poc",
  …
}
```

---

## 7. Configure passkeys & iCloud

### \`app.json\`

```jsonc
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.example.privypoc",
      "associatedDomains": ["webcredentials:passkey.example.com"]
    },
    "android": {
      "package": "com.example.privypoc",
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": { "deploymentTarget": "17.5" },
          "android": { "compileSdkVersion": 34 }
        }
      ]
    ]
  }
}
```

> **Associated domain** must host a \`/.well-known/apple-app-site-association\` file listing your bundle ID.

### Privy dashboard

1. **Authentication ▸ Login methods**  
   * Disable Email, SMS, Social, Wallet  
   * **Enable Passkeys** only
2. **Embedded wallets ▸ Self-custody**  
   * Toggle **Require additional auth for new devices**  
   * Select **iCloud backup** (optionally add *Password*)
3. Copy your **App ID** (used in code below)

---

## 8. Minimal App code

Replace \`App.tsx\` or create **\`app/_layout.tsx\`** (Expo Router):

```tsx
import React from "react";
import { PrivyProvider, usePrivy } from "@privy-io/expo";
import { Text, View, Button } from "react-native";

const APP_ID = "prv_XXXXXXXXXXXXXXXXXXXX";    // <-- replace

export default function Root() {
  return (
    <PrivyProvider
      appId={APP_ID}
      config={{
        loginMethods: ["passkey"],
        embeddedWallets: {
          createOnLogin: "all",
          requireRecoveryPrompt: true,  // force iCloud enrolment
          enableSelfCustodyMode: true
        }
      }}
    >
      <Home />
    </PrivyProvider>
  );
}

function Home() {
  const {
    ready,
    authenticated,
    user,
    login,
    logout,
    wallets
  } = usePrivy();

  if (!ready) return <Text>Loading SDK…</Text>;

  if (!authenticated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Button title="Sign in with Passkey" onPress={() => login()} />
      </View>
    );
  }

  const eth = wallets.ethereum?.address ?? "…creating";

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Hi {user.email ?? "anon"}!</Text>
      <Text>Your ETH address:</Text>
      <Text selectable>{eth}</Text>

      <Button title="Logout" onPress={() => logout()} />
    </View>
  );
}
```

#### Prompting iCloud enrolment later

If you set \`requireRecoveryPrompt: false\`, call it manually:

```tsx
import { useEnrollRecoveryFactor } from "@privy-io/expo";

const { enrollICloud } = useEnrollRecoveryFactor();

<Button title="Enable iCloud Backup" onPress={enrollICloud} />
```

---

## 9. Build & run

```bash
# iOS simulator
npx expo run:ios

# Android emulator
npx expo run:android
```

When the app first launches you’ll see the system **passkey** sheet, then an **iCloud Key-Value Store** prompt (because recovery is required).

---

## 10. Testing recovery

1. Build the app on a second simulator or physical device  
2. Sign in with the same passkey  
3. After iCloud authentication the wallet address should match the first device  

If Privy’s servers are ever offline, the SDK combines **device + iCloud** shares locally so the user can still export or sweep funds.

---

## 11. Resources

| Topic | Link |
|-------|------|
| Expo SDK quick-start | <https://docs.privy.io/guide/expo> |
| Passkey setup guide | <https://docs.privy.io/guide/expo/setup/passkey> |
| Recovery (iCloud) overview | <https://docs.privy.io/guide/expo/embedded/recovery/overview> |
| Expo native-extensions package | <https://www.npmjs.com/package/@privy-io/expo-native-extensions> |
| Minimal starter repo | <https://github.com/privy-io/expo-starter> |

---

*Happy hacking!*
