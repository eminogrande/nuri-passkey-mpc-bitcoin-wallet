import React, { useState, useCallback } from "react";
import { Text, View, Button, ScrollView } from "react-native";

import {
  usePrivy,
  useEmbeddedBitcoinWallet,
} from "@privy-io/expo";
import Constants from "expo-constants";
import { useLinkWithPasskey } from "@privy-io/expo/passkey";
import { PrivyUser } from "@privy-io/public-api";
import * as Crypto from "expo-crypto";

const toMainIdentifier = (x: PrivyUser["linked_accounts"][number]) => {
  if (x.type === "phone") {
    return x.phoneNumber;
  }
  if (x.type === "email" || x.type === "wallet") {
    return x.address;
  }

  if (x.type === "twitter_oauth" || x.type === "tiktok_oauth") {
    return x.username;
  }

  if (x.type === "custom_auth") {
    return x.custom_user_id;
  }

  return x.type;
};

export const UserScreen = () => {
  const [signedMessages, setSignedMessages] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string>("");

  const { logout, user } = usePrivy();
  const { linkWithPasskey } = useLinkWithPasskey();
  const { wallets, create } = useEmbeddedBitcoinWallet();
  const account = wallets?.[0]; // Bitcoin wallets are accessed directly from the hook

  const signMessage = useCallback(async () => {
    try {
      if (!wallets?.[0]) {
        setFeedback("No Bitcoin wallet found. Please create one first.");
        return;
      }

      const provider = await wallets[0].getProvider();
      const messageToSign = `Message to sign: ${Date.now()}`;

      // Compute SHA-256 hash (hex) of the message – required by Privy sign()
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        messageToSign,
        {
          encoding: Crypto.CryptoEncoding.HEX,
        },
      );

      setFeedback("Requesting signature from wallet...");
      const { signature } = await (provider as any).sign({ hash });

      if (signature) {
        setSignedMessages((prev) => prev.concat(signature));
        setFeedback("Message signed successfully!");
      } else {
        setFeedback("Signing failed or was rejected.");
      }
    } catch (e: any) {
      setFeedback(`Error signing message: ${e?.message ?? e}`);
    }
  }, [wallets]);

  const handleCreateWallet = useCallback(async () => {
    try {
      setFeedback("Creating Bitcoin wallet...");
      await create({ chainType: "bitcoin-taproot" });
      setFeedback("Bitcoin wallet created successfully!");
    } catch (e: any) {
      setFeedback(`Error creating wallet: ${e?.message ?? e}`);
    }
  }, [create]);

  const handleLinkPasskey = useCallback(async () => {
    try {
      setFeedback("Linking passkey…");
      await linkWithPasskey({
        relyingParty: Constants.expoConfig?.extra?.passkeyAssociatedDomain,
      });
      setFeedback("Passkey linked successfully!");
    } catch (e: any) {
      setFeedback(`Error linking passkey: ${e?.message ?? e}`);
    }
  }, [linkWithPasskey]);

  if (!user) {
    return null;
  }

  return (
    <View>
      <Button title="Link Passkey" onPress={handleLinkPasskey} />

      <ScrollView style={{ borderColor: "rgba(0,0,0,0.1)", borderWidth: 1 }}>
        <View
          style={{
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <View>
            <Text style={{ fontWeight: "bold" }}>User ID</Text>
            <Text>{user.id}</Text>
          </View>

          <View>
            <Text style={{ fontWeight: "bold" }}>Linked accounts</Text>
            {user?.linked_accounts.length ? (
              <View style={{ display: "flex", flexDirection: "column" }}>
                {user?.linked_accounts?.map((m) => (
                  <Text
                    key={m.verified_at}
                    style={{
                      color: "rgba(0,0,0,0.5)",
                      fontSize: 12,
                      fontStyle: "italic",
                    }}
                  >
                    {m.type}: {toMainIdentifier(m)}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>

          <View>
            {account?.address && (
              <>
                <Text style={{ fontWeight: "bold" }}>Bitcoin Wallet</Text>
                <Text>{account?.address}</Text>
              </>
            )}

            <Button title="Create Bitcoin Wallet (Testnet)" onPress={handleCreateWallet} />


          </View>

          <View style={{ display: "flex", flexDirection: "column" }}>
            <Button
              title="Sign Message"
              onPress={signMessage}
            />

            {feedback && (
              <Text style={{ color: "blue" }}>{feedback}</Text>
            )}

            <Text>Messages signed:</Text>
            {signedMessages.map((m) => (
              <React.Fragment key={m}>
                <Text
                  style={{
                    color: "rgba(0,0,0,0.5)",
                    fontSize: 12,
                    fontStyle: "italic",
                  }}
                >
                  {m}
                </Text>
                <View
                  style={{
                    marginVertical: 5,
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(0,0,0,0.2)",
                  }}
                />
              </React.Fragment>
            ))}
          </View>
          <Button title="Logout" onPress={logout} />
        </View>
      </ScrollView>
    </View>
  );
};
