export default {
  expo: {
    name: "Nuri Passkey Test",
    slug: "nuri-passkey-test",
    version: "0.0.1",
    owner: "nuriwallet",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "nuritest",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      usesAppleSignIn: true,
      supportsTablet: true,
      bundleIdentifier: "com.nuri.passkeytest",
      associatedDomains: ["webcredentials:nuri.com"],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        CFBundleDisplayName: "Nuri Passkey Test",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: "com.nuri.passkeytest",
      edgeToEdgeEnabled: true,
    },
    extra: {
      privyAppId: "cmaz6gvx500zykw0lfnlv4lrb",
      privyClientId: "client-WY6LLkqWnXYc7pzZRgxosYUCiSHddSsfUaYnW2E9rA1rV",
      passkeyAssociatedDomain: "https://nuri.com",
      eas: {
        projectId: "bb069aaf-6ea1-487a-b300-e3c8a1d50408",
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
    experiments: {
      typedRoutes: true,
    },
    newArchEnabled: true,
    web: {
      favicon: "./assets/favicon.png",
    },
  },
}; 