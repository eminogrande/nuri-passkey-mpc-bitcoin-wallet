import React, { useState, useCallback } from "react";
import { Text, TextInput, View, Button, ScrollView, Alert } from "react-native";

import {
  usePrivy,
  useEmbeddedEthereumWallet,
  getUserEmbeddedEthereumWallet,
  PrivyEmbeddedWalletProvider,
  useEmbeddedBitcoinWallet,
} from "@privy-io/expo";
import Constants from "expo-constants";
import { useLinkWithPasskey } from "@privy-io/expo/passkey";
import { PrivyUser } from "@privy-io/public-api";

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
  const [chainId, setChainId] = useState("1");
  const [signedMessages, setSignedMessages] = useState<string[]>([]);
  const [bitcoinWalletAddress, setBitcoinWalletAddress] = useState('');

  const { logout, user } = usePrivy();
  const { linkWithPasskey } = useLinkWithPasskey();
  const { wallets, create } = useEmbeddedEthereumWallet();
  const { create: bitcoinCreate } = useEmbeddedBitcoinWallet();
  const account = getUserEmbeddedEthereumWallet(user);

  const signMessage = useCallback(
    async (provider: PrivyEmbeddedWalletProvider) => {
      try {
        const message = await provider.request({
          method: "personal_sign",
          params: [`0x0${Date.now()}`, account?.address],
        });
        if (message) {
          setSignedMessages((prev) => prev.concat(message));
        }
      } catch (e) {
        console.error(e);
      }
    },
    [account?.address]
  );

  const switchChain = useCallback(
    async (provider: PrivyEmbeddedWalletProvider, id: string) => {
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: id }],
        });
        alert(`Chain switched to ${id} successfully`);
      } catch (e) {
        console.error(e);
      }
    },
    [account?.address]
  );

  if (!user) {
    return null;
  }

  return (
    <View>
      <Button
        title="Link Passkey"
        onPress={() =>
          linkWithPasskey({
            relyingParty: Constants.expoConfig?.extra?.passkeyAssociatedDomain,
          })
        }
      />

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
                <Text style={{ fontWeight: "bold" }}>Embedded Wallet</Text>
                <Text>{account?.address}</Text>
              </>
            )}

            <Button title="Create Wallet" onPress={async () => {
              try {
                const newEthWallet = await create();
                if (newEthWallet?.address) {
                  // The address will be displayed by the existing UI once `account` updates
                  Alert.alert("Success", `Ethereum wallet created: ${newEthWallet.address}`);
                } else {
                  console.warn("Ethereum wallet creation did not return an address or wallet object.");
                  Alert.alert("Error", "Failed to create Ethereum wallet. No address returned. Please try again.");
                }
              } catch (error: any) {
                console.error("Error creating Ethereum wallet:", error);
                Alert.alert("Error", "Failed to create Ethereum wallet. Please try again.");
              }
            }} />
            <Button
              title="Create Bitcoin Wallet"
              onPress={async () => {
                try {
                  console.log("Attempting to create Bitcoin wallet...");
                  const ethAccount = getUserEmbeddedEthereumWallet(user);
                  if (!ethAccount?.address) {
                    Alert.alert(
                      "Requirement",
                      "Please create an Ethereum wallet first. Bitcoin wallet creation requires a primary Ethereum wallet."
                    );
                    return;
                  }
                  const newBitcoinWallet = await bitcoinCreate({ chainType: 'bitcoin-taproot' });
                  if (newBitcoinWallet?.address) {
                    setBitcoinWalletAddress(newBitcoinWallet.address);
                    Alert.alert("Success", `Bitcoin wallet created: ${newBitcoinWallet.address}`);
                  } else if (newBitcoinWallet) {
                    console.warn("Bitcoin wallet creation did not return an address.");
                    Alert.alert("Error", "Bitcoin wallet created, but no address was returned. Please contact support if this issue persists.");
                  } else {
                    console.warn("Bitcoin wallet creation failed, wallet object is null or undefined.");
                    Alert.alert("Error", "Failed to create Bitcoin wallet. The wallet object was not returned. Please try again.");
                  }
                } catch (error: any) {
                  console.error("Error creating Bitcoin wallet:", error);
                  Alert.alert("Error", "Failed to create Bitcoin wallet. Please try again.");
                }
              }}
            />
            {bitcoinWalletAddress ? (
              <>
                <Text style={{ fontWeight: "bold" }}>Bitcoin Wallet</Text>
                <Text>{bitcoinWalletAddress}</Text>
              </>
            ) : null}

            <>
              <Text>Chain ID to set to:</Text>
              <TextInput
                value={chainId}
                onChangeText={setChainId}
                placeholder="Chain Id"
              />
              <Button
                title="Switch Chain"
                onPress={async () =>
                  switchChain(await wallets[0].getProvider(), chainId)
                }
              />
            </>
          </View>

          <View style={{ display: "flex", flexDirection: "column" }}>
            <Button
              title="Sign Message"
              onPress={async () => signMessage(await wallets[0].getProvider())}
            />

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
