# Privy Expo Starter – Real-World Setup & Security

This project demonstrates a production-ready Expo app using Privy for passkey-based, MPC-secured wallets.  
It covers all the steps, config, and learnings needed to get passkeys working on iOS (TestFlight) with maximum security and user recovery.

---

## 🚀 Quick Start

### 1. Install dependencies

```sh
npm i
```

---

### 2. Expo & App Config

**`app.config.js`** (or `app.json`):

```js
export default {
  expo: {
    name: "Nuri Passkey Test",
    slug: "nuri-passkey-test",
    version: "0.0.1",
    owner: "nuriwallet",
    ios: {
      bundleIdentifier: "com.nuri.passkeytest",
      associatedDomains: ["webcredentials:nuri.com"],
      supportsTablet: true,
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        CFBundleDisplayName: "Nuri Passkey Test",
      },
    },
    android: {
      package: "com.nuri.passkeytest",
      edgeToEdgeEnabled: true,
    },
    extra: {
      privyAppId: "<your-privy-app-id>",
      privyClientId: "<your-privy-client-id>",
      passkeyAssociatedDomain: "https://nuri.com",
      eas: {
        projectId: "<your-eas-project-id>",
      },
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-apple-authentication",
      ["expo-build-properties", {
        ios: { deploymentTarget: "17.5" },
        android: { compileSdkVersion: 34 },
      }],
      "expo-font",
    ],
  },
};
```

---

### 3. Apple Developer Setup

- Register your bundle ID (`com.nuri.passkeytest`) in the Apple Developer portal.
- Enable **Associated Domains** capability.
- Add `webcredentials:nuri.com` to the associated domains.
- Upload your `apple-app-site-association` file to `https://nuri.com/.well-known/apple-app-site-association`:

```json
{
  "webcredentials": {
    "apps": [
      "MH2SRQ3N27.com.nuri.passkeytest"
    ]
  }
}
```
- Make sure the file is served as `Content-Type: application/json` (no extension, no redirects).

---

### 4. Privy Dashboard Setup

- Create a new app client for your app.
- Set:
  - **App identifier**: `com.nuri.passkeytest`
  - **URL scheme**: `nuritest`
- Enable **Passkeys** as a login method.
- Enable "Passkeys for sign up" if you want users to create accounts with passkeys only.

---

### 5. Code Changes

- Use both `signupWithPasskey` and `loginWithPasskey` in your login screen:

```tsx
import { useLoginWithPasskey, useSignupWithPasskey } from "@privy-io/expo/passkey";
const { loginWithPasskey } = useLoginWithPasskey({ ... });
const { signupWithPasskey } = useSignupWithPasskey({ ... });
const rp = Constants.expoConfig?.extra?.passkeyAssociatedDomain;

<Button title="Create account with Passkey" onPress={() => signupWithPasskey({ relyingParty: rp })} />
<Button title="Login using Passkey" onPress={() => loginWithPasskey({ relyingParty: rp })} />
```

---

### 6. Build & Ship to TestFlight

Build and upload directly to TestFlight with:

```sh
eas build --platform ios --auto-submit --profile production --non-interactive
```

---

## 🛡️ How Privy's MPC Wallet Security Works

**Privy uses a multi-party computation (MPC) model for wallet security:**

- **Key is split into 2 or 3 shares:**
  1. **Device share**: Stays on your phone, protected by Face ID/Touch ID or your passkey (or hardware key, if registered via web).
  2. **Privy share**: Stored in Privy's secure enclave (TEE), never leaves their infrastructure.
  3. **(Optional) iCloud backup share**: Encrypted and stored in your iCloud Keychain for recovery.

- **No single point of failure:**
  - Neither Privy nor the user alone can access the wallet.
  - Both the device and Privy must cooperate to sign transactions.

- **Passkey = access control, not a signing key:**
  - The passkey (Face ID, Touch ID, or hardware key) is used to unlock the device share.
  - The actual wallet signing happens in the secure enclave (TEE) at Privy, using both shares.

- **Recovery:**
  - If you lose your phone, you can recover with your iCloud backup or a hardware key (if registered via web).
  - If Privy goes down, your funds are safe—no one (not even Privy) can move them without your device share.

- **Security is similar to Bitkey and other modern MPC wallets:**
  - No seed phrase, no single device or server can compromise your wallet.
  - You can use either your phone (biometric passkey) or a hardware security key (if registered) to recover.

---

## 🟢 Security Comparison: Nuri Wallet (Privy + FIDO2), Bitkey, and Muun

| Feature                | Bitkey (2-of-3 Multisig)         | Nuri Wallet (Privy + FIDO2, enforced)      | Muun Wallet (2-of-2)         |
|------------------------|-----------------------------------|--------------------------------------------|------------------------------|
| **Key Model**          | 2-of-3 Multisig                   | 2-of-2 (or 2-of-3) MPC                     | 2-of-2 Multisig              |
| **Hardware Key**       | Optional, can be used for signing | Required for all signing (if enforced)      | Not supported                |
| **Phone Passkey**      | Can be used for signing           | Only allowed as backup (optional)           | Phone key only               |
| **Server Role**        | Holds 1 full key, signs if needed | Holds 1 share, must participate in MPC      | Holds 1 key, signs if needed |
| **Full Key Exists?**   | Yes, on each device/server        | Never, only shares exist                    | Yes, on each device/server   |
| **Single Point of Failure?** | No                          | No                                         | No                           |
| **Recovery**           | Any 2 of 3 keys                   | Hardware key + server, or iCloud + server   | Email recovery, phone + server|
| **If server is down**  | Can't sign with phone alone       | Can't sign with device alone                | Can't sign with phone alone  |

### **Muun Wallet**  
- Uses a 2-of-2 multisig: one key on the phone, one on Muun's server.
- Both must sign for a transaction to go through.
- Recovery is via email and phone, but no hardware key support.
- If Muun's server is down, you can use their recovery tool to sweep funds with your phone key and recovery instructions.

---

## 🟠 How to Make Nuri Wallet Even More Secure

- **Enforce FIDO2 hardware key for all sign-in and signing.**
  - Do not allow users to register a phone passkey as a primary method.
  - Only allow adding a phone passkey as a backup, after a hardware key is registered and verified.
- **Result:**  
  - The device share is only accessible with the hardware key.
  - Even if someone steals the phone, they cannot unlock the wallet without the hardware key.

---

## 📝 Key Learnings & Troubleshooting

- **Double Team ID issues**: Always use a clean bundle ID and make sure your AASA file matches exactly what iOS reports.
- **AASA file**: Must be valid JSON, correct content-type, and contain only the relevant app ID(s).
- **Passkey registration**: Only platform passkeys (Face ID/Touch ID) can be registered in the app today. Hardware keys must be registered via web.
- **Privy config**: Use both `signupWithPasskey` and `loginWithPasskey` for a smooth UX.
- **TestFlight**: Use EAS auto-submit for seamless CI/CD.

---

## 🧑‍💻 For Developers

- All config is in `app.config.js` and the Privy dashboard.
- No secrets or keys are ever stored in the app or on Privy's servers alone.
- The user's funds are protected by both device and server, with optional iCloud backup for recovery.

---

## 📚 References

- [Privy Docs: Expo Integration](https://docs.privy.io/guide/expo/dashboard)
- [Privy Docs: Passkeys](https://docs.privy.io/authentication/user-authentication/login-methods/passkey)
- [Apple: Associated Domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains)
- [Bitkey Security Model](https://bitkey.world/)
- [Muun Wallet Security](https://support.muun.com/hc/en-us/articles/360041024091-How-does-Muun's-security-model-work-)

---

## 🟣 Summary

- **Bitkey, Nuri Wallet (Privy + FIDO2), and Muun** all use modern, non-custodial, multi-party security models.
- **Nuri Wallet** can be made even more secure by enforcing hardware key-only authentication for all signing, making it at least as secure as Bitkey, and more flexible than Muun.
- **No single party can ever move funds alone in any of these models.**
- **Recovery is always possible** with the right combination of factors (hardware key, iCloud, or server).

If you want to enforce hardware key-only authentication in your app, make sure your onboarding flow only allows FIDO2 hardware key registration for the initial passkey, and only allows adding a phone passkey as a backup after verifying the hardware key.

Let me know if you want a code snippet or UI flow for enforcing this!
