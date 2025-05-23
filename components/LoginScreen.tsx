import { Button, Linking, Text, View } from "react-native";
import { LoginWithOAuthInput, useLoginWithOAuth } from "@privy-io/expo";
import { useLogin } from "@privy-io/expo/ui";
import { useLoginWithPasskey } from "@privy-io/expo/passkey";
import Constants from "expo-constants";
import { useState } from "react";
import { Platform } from "react-native";
// import * as Application from "expo-application"; // No longer needed

function renderErrorDetails(err: any) {
  if (!err) return null;
  return (
    <View style={{ marginVertical: 10, padding: 8, backgroundColor: '#fff0f0', borderRadius: 6, borderColor: '#f00', borderWidth: 1, maxWidth: 350 }}>
      <Text style={{ color: 'red', fontWeight: 'bold' }}>Last error object:</Text>
      {err.code && <Text style={{ color: 'red' }}>code: {err.code}</Text>}
      {err.message && <Text style={{ color: 'red' }}>message: {err.message}</Text>}
      {err.details && <Text style={{ color: 'red' }}>details: {JSON.stringify(err.details)}</Text>}
      {err.stack && <Text style={{ color: 'red', fontSize: 10 }}>stack: {err.stack}</Text>}
      <Text style={{ color: 'red', fontSize: 10 }}>Full error object:</Text>
      <Text style={{ color: 'red', fontSize: 10 }}>{JSON.stringify(err, null, 2)}</Text>
    </View>
  );
}

export default function LoginScreen() {
  const [error, setError] = useState("");
  const [lastErrorObj, setLastErrorObj] = useState<any>(null);
  const { loginWithPasskey } = useLoginWithPasskey({
    onError: (err) => {
      setError(err.message ? err.message : JSON.stringify(err));
      setLastErrorObj(err);
    },
  });
  const { login } = useLogin();
  const oauth = useLoginWithOAuth({
    onError: (err) => {
      setError(err.message ? err.message : JSON.stringify(err));
      setLastErrorObj(err);
    },
  });
  const bundleIdentifier = Constants.expoConfig?.ios?.bundleIdentifier;
  const privyAppId = Constants.expoConfig?.extra?.privyAppId;
  const privyClientId = Constants.expoConfig?.extra?.privyClientId;
  const passkeyAssociatedDomain = Constants.expoConfig?.extra?.passkeyAssociatedDomain;
  const scheme = Constants.expoConfig?.scheme;
  const deviceName = Constants.deviceName || "unknown";
  const osName = Platform.OS;
  const osVersion = Platform.Version;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        marginHorizontal: 10,
      }}
    >
      <Text style={{ fontWeight: "bold", fontSize: 16 }}>Debug Info</Text>
      <Text>bundleIdentifier: <Text style={{ fontSize: 10 }}>{bundleIdentifier}</Text></Text>
      <Text>privyAppId: <Text style={{ fontSize: 10 }}>{privyAppId}</Text></Text>
      <Text>privyClientId: <Text style={{ fontSize: 10 }}>{privyClientId}</Text></Text>
      <Text>passkeyAssociatedDomain: <Text style={{ fontSize: 10 }}>{passkeyAssociatedDomain}</Text></Text>
      <Text>scheme: <Text style={{ fontSize: 10 }}>{scheme}</Text></Text>
      <Text>deviceName: <Text style={{ fontSize: 10 }}>{deviceName}</Text></Text>
      <Text>osName: <Text style={{ fontSize: 10 }}>{osName}</Text></Text>
      <Text>osVersion: <Text style={{ fontSize: 10 }}>{osVersion}</Text></Text>
      {renderErrorDetails(lastErrorObj)}
      <Text>Privy App ID:</Text>
      <Text style={{ fontSize: 10 }}>{privyAppId}</Text>
      <Text>Privy Client ID:</Text>
      <Text style={{ fontSize: 10 }}>{privyClientId}</Text>
      <Text>
        Navigate to your{" "}
        <Text
          onPress={() =>
            Linking.openURL(
              `https://dashboard.privy.io/apps/${privyAppId}/settings?setting=clients`
            )
          }
        >
          dashboard
        </Text>{" "}
        and ensure the following Expo Application ID is listed as an `Allowed
        app identifier`:
      </Text>
      <Text style={{ fontSize: 10 }}>{bundleIdentifier}</Text>
      <Text>
        Navigate to your{" "}
        <Text
          onPress={() =>
            Linking.openURL(
              `https://dashboard.privy.io/apps/${privyAppId}/settings?setting=clients`
            )
          }
        >
          dashboard
        </Text>{" "}
        and ensure the following value is listed as an `Allowed app URL scheme`:
      </Text>
      <Text style={{ fontSize: 10 }}>{scheme}</Text>
      <Button
        title="Login with Privy UIs"
        onPress={() => {
          login({ loginMethods: ["email"] })
            .then((session) => {
              // You can add more debug info here if needed
            })
            .catch((err) => {
              setError(err.message ? err.message : JSON.stringify(err));
              setLastErrorObj(err);
            });
        }}
      />
      <Button
        title="Login using Passkey"
        onPress={() =>
          loginWithPasskey({
            relyingParty: passkeyAssociatedDomain,
          })
        }
      />
      <View
        style={{ display: "flex", flexDirection: "column", gap: 5, margin: 10 }}
      >
        {["github", "google", "discord", "apple"].map((provider) => (
          <View key={provider}>
            <Button
              title={`Login with ${provider}`}
              disabled={oauth.state.status === "loading"}
              onPress={() => oauth.login({ provider } as LoginWithOAuthInput)}
            ></Button>
          </View>
        ))}
      </View>
      {error && <Text style={{ color: "red" }}>Error: {error}</Text>}
    </View>
  );
}
