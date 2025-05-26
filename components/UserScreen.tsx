import React, { useState, useCallback, useEffect } from "react"; // Added useEffect
import { Text, TextInput, View, Button, ScrollView } from "react-native";
import { useLogging } from "../context/LoggingContext"; // Import useLogging

import {
  usePrivy,
  useEmbeddedEthereumWallet,
  getUserEmbeddedEthereumWallet,
  PrivyEmbeddedWalletProvider,
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

  const { logout, user } = usePrivy();
  // Retrieve logging functions (addLog, setAppError) from LoggingContext
  // to enable structured logging and error reporting throughout this component.
  const { addLog, setAppError } = useLogging();
  const { linkWithPasskey } = useLinkWithPasskey();
  // useEmbeddedEthereumWallet provides functions and state related to the embedded wallet,
  // including `wallets` (an array of available embedded wallets) and `create` (function to create a new one).
  const { wallets, create } = useEmbeddedEthereumWallet();
  // Get the user's primary embedded Ethereum wallet, if available.
  // `account` will be null if no wallet is found for the user.
  const account = getUserEmbeddedEthereumWallet(user);

  /**
   * @useEffect
   * This hook manages the automatic check and creation of an Ethereum wallet when the UserScreen component mounts
   * or when relevant dependencies (like the user object or wallet status) change.
   * Its primary goal is to ensure a user has an Ethereum wallet available shortly after logging in,
   * without requiring manual intervention.
   *
   * Dependencies:
   * - `user`: The Privy user object. Changes to this (e.g., user logs in/out) should trigger the effect.
   * - `create`: The wallet creation function from `useEmbeddedEthereumWallet`. Included to ensure the effect has the latest version.
   * - `addLog`: Logging function. Included for stable logging capabilities.
   * - `setAppError`: Error reporting function. Included for stable error reporting.
   * - `account`: The user's current Ethereum wallet. Changes (e.g., wallet created) should re-evaluate the effect.
   * - `wallets`: The array of available embedded wallets. Changes here (e.g., after creation) should re-evaluate.
   */
  useEffect(() => {
    // Log that the component has mounted and the wallet check is starting.
    addLog("UserScreen mounted. Checking for Ethereum wallet.");

    if (user) { // Proceed only if the user object is available.
      // Condition to trigger wallet creation:
      // 1. `!account`: No primary Ethereum wallet is currently associated with the user.
      // 2. `wallets && wallets.length === 0`: The `wallets` array from `useEmbeddedEthereumWallet` is empty.
      //    This is crucial because `create()` might have been called but `account` (from `getUserEmbeddedEthereumWallet`)
      //    might not have updated immediately. `wallets.length === 0` helps ensure we don't try to create
      //    a wallet if one is already in the process of being created or has just been created by `useEmbeddedEthereumWallet`.
      if (!account && wallets && wallets.length === 0) {
        // Log that no wallet was found and an attempt to create one will be made.
        addLog("No Ethereum wallet found. Attempting to create one (auto).");
        (async () => {
          try {
            // Log the specific attempt to auto-create the wallet.
            addLog("Attempting to create Ethereum wallet (auto)...");
            await create();
            // Log successful initiation of the wallet creation process.
            // Note: The `account` variable will update in a subsequent render cycle,
            // at which point the `else if (account)` block below will log the new address.
            addLog("Ethereum wallet auto-creation process initiated successfully.");
          } catch (error: any) {
            // Log any error encountered during the automatic wallet creation.
            addLog(`Error during automatic Ethereum wallet creation: ${error.message}`);
            // Set the error in the global application state for visibility in DebugLog.
            setAppError(error);
          }
        })();
      } else if (account) {
        // If an account (wallet) already exists, log its address.
        addLog(`Existing Ethereum wallet found: ${account.address}`);
      } else if (wallets && wallets.length > 0) {
        // This case handles scenarios where `wallets` array is populated (e.g., wallet exists or is being created)
        // but `account` might still be null temporarily.
        addLog(`Ethereum wallet found in 'wallets' array: ${wallets[0].address}. 'account' may update shortly.`);
      }
    } else {
      // Log if the user object is not yet available when the effect runs.
      addLog("User object not available yet in UserScreen useEffect for wallet check.");
    }
  }, [user, create, addLog, setAppError, account, wallets]);

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

            <Button
              title="Create Wallet"
              onPress={async () => {
                // Log that the manual "Create Wallet" button was clicked.
                addLog("Manual 'Create Wallet' (Ethereum) button clicked.");
                try {
                  // Log the attempt to manually create an Ethereum wallet.
                  addLog("Attempting to create Ethereum wallet (manual trigger).");
                  await create();
                  // Log successful initiation of the manual wallet creation.
                  // The `useEffect` hook observing `account` and `wallets` will log the new address once it's available.
                  addLog("Manual Ethereum wallet creation process initiated successfully.");
                } catch (error: any) {
                  // Log any error encountered during manual wallet creation.
                  addLog(`Error during manual Ethereum wallet creation: ${error.message}`);
                  // Set the error in the global application state.
                  setAppError(error);
                }
              }}
            />

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

// TODO: Enhance logging for Bitcoin wallet creation
// This placeholder outlines the requirements for future logging related to Bitcoin wallet
// creation functionality, should it be implemented. The goal is to maintain a
// consistent and detailed logging approach across different wallet types.
//
// Key aspects to log for Bitcoin wallet creation:
// 1. Initiation: Log when the Bitcoin wallet creation process begins.
//    Example: addLog("Attempting to create Bitcoin wallet.");
// 2. Parameters (if applicable and secure): Log any relevant parameters used for creation,
//    ensuring no sensitive data is exposed.
// 3. Success: Log the successful creation, including the Bitcoin wallet address or other
//    relevant identifiers.
//    Example: addLog(`Bitcoin wallet created successfully: ${bitcoinWallet.address}`);
// 4. Errors: Log any errors encountered, providing specific error messages.
//    Example: addLog(`Error creating Bitcoin wallet: ${errorMessage}`);
// 5. Contextual Logging: Use `addLog` for informational messages and `setAppError`
//    for critical errors that should be surfaced prominently in the debug UI.
//
// Example implementation structure:
// const handleCreateBitcoinWallet = async () => {
//   addLog("Attempting to create Bitcoin wallet.");
//   try {
//     // --- Bitcoin wallet creation logic (e.g., API calls) ---
//     // const bitcoinWallet = await someBitcoinWalletCreationAPI(params);
//     // addLog(`Bitcoin wallet created successfully: ${bitcoinWallet.address}`);
//     // --- End of logic ---
//   } catch (error) {
//     const errorMessage = error instanceof Error ? error.message : String(error);
//     addLog(`Error creating Bitcoin wallet: ${errorMessage}`);
//     setAppError(error); // Report critical error
//   }
// };
//
// This logging should be integrated directly into the Bitcoin wallet creation
// function or event handler when that functionality is developed.
