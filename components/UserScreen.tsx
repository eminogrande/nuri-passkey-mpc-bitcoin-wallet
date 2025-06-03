import React, { useState, useCallback, useEffect } from "react";
import { Text, View, Button, ScrollView, TextInput, Linking, Alert } from "react-native";
import { TouchableOpacity } from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-styled";
import { bytesToHex } from "@noble/hashes/utils";
import { Transaction, bip32Path } from "@scure/btc-signer";
import SecuritySettingsScreen from "../app/settings/security";

import {
  usePrivy,
  useEmbeddedBitcoinWallet,
  useEmbeddedEthereumWallet,
  getUserEmbeddedEthereumWallet,
} from "@privy-io/expo";
import Constants from "expo-constants";
import { useLinkWithPasskey } from "@privy-io/expo/passkey";
import { PrivyUser } from "@privy-io/public-api";
import * as Crypto from "expo-crypto";
import { Buffer } from 'buffer';

if (typeof global !== 'undefined' && !global.Buffer) global.Buffer = Buffer;

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

// simple hex decoder
const hexToBytes = (hex: string) => Uint8Array.from(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));

// -----------------------------------------------------------------------------
// 🔧  Developer debug helper – collects runtime events & errors on-screen
// -----------------------------------------------------------------------------
//  Usage:   log('text')  or log({obj})
//  Keeps a rolling buffer (max 200 entries) so that testers can scroll & copy
// -----------------------------------------------------------------------------

export const UserScreen = () => {
  const [signedMessages, setSignedMessages] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string>("");
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);

  // ---- Send BTC states ----
  const [amount, setAmount] = useState<string>(""); // sats
  const [recipient, setRecipient] = useState<string>("");
  const [feeSat, setFeeSat] = useState<number | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [signedTxHex, setSignedTxHex] = useState<string | null>(null);

  const { logout, user } = usePrivy();
  const { linkWithPasskey } = useLinkWithPasskey();

  // Bitcoin wallet hooks
  const { wallets, create } = useEmbeddedBitcoinWallet();
  const account = wallets?.[0]; // Bitcoin wallets are accessed directly from the hook

  // Ethereum wallet hooks (for automatic creation if missing)
  const {
    wallets: ethWallets,
    create: createEthereumWallet,
  } = useEmbeddedEthereumWallet();
  const ethAccount = getUserEmbeddedEthereumWallet(user);

  // Ensure the user has an Ethereum wallet – required by Privy backend before Bitcoin wallet creation.
  useEffect(() => {
    const ensureEthereumWalletExists = async () => {
      try {
        if (user && !ethAccount && (ethWallets?.length ?? 0) === 0) {
          console.log("No Ethereum wallet detected. Creating one automatically …");
          await createEthereumWallet();
          console.log("Ethereum wallet creation triggered successfully.");
        }
      } catch (e: any) {
        console.error("Auto-create Ethereum wallet failed:", e?.message ?? e);
      }
    };

    ensureEthereumWalletExists();
  }, [user, ethAccount, ethWallets, createEthereumWallet]);

  const log = useCallback((msg: any) => {
    const str = typeof msg === "string" ? msg : JSON.stringify(msg, null, 2);
    console.log("[UI]", str);
    setDebugLines((prev) => {
      const next = prev.concat(str);
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  }, []);

  const logSafe = (obj: any) => {
    // Recursively convert BigInt to string for logging
    const replacer = (_: string, value: any) =>
      typeof value === 'bigint' ? value.toString() : value;
    log(JSON.parse(JSON.stringify(obj, replacer)));
  };

  // Fetch Bitcoin main-net balance helper
  const fetchBalance = useCallback(async () => {
    if (!account?.address) return;
    try {
      setBalanceLoading(true);
      log(`Fetching balance for ${account.address}`);
      const res = await fetch(`https://blockstream.info/api/address/${account.address}`);
      const json = await res.json();
      log({ balanceResponse: json });
      const funded = json?.chain_stats?.funded_txo_sum ?? 0;
      const spent = json?.chain_stats?.spent_txo_sum ?? 0;
      setBalance(String(funded - spent));
      setBalanceError(null);
    } catch (e) {
      const msg = (e as any)?.message ?? e;
      console.error("Error fetching BTC balance", msg);
      setFeedback(`Error fetching BTC balance: ${msg}`);
      log(`Balance fetch error: ${msg}`);
      setBalance(null);
      setBalanceError(String(msg));
    } finally {
      setBalanceLoading(false);
    }
  }, [account?.address, setBalanceLoading]);

  // Initial fetch when address becomes available
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

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

  // address validation function
  const isValidAddress = (addr: string) => /^(bc1|[13])[a-z0-9]{25,59}$/i.test(addr);

  // Fetch fee rate helper
  const fetchFee = useCallback(async () => {
    try {
      setFeeLoading(true);
      log("Fetching fee estimate (halfHourFee) …");
      const res = await fetch("https://mempool.space/api/v1/fees/recommended");
      const json = await res.json();
      log({ feeResponse: json });
      const rate = json?.halfHourFee ?? 10; // sat/vB
      // naive size 110 vB
      setFeeSat(rate * 110);
    } catch (e) {
      console.error("Fee fetch error", e);
      setFeedback(`Fee fetch error: ${(e as any).message ?? e}`);
      log(`Fee fetch error: ${(e as any).message ?? e}`);
      setFeeSat(null);
    } finally {
      setFeeLoading(false);
    }
  }, []);

  useEffect(() => { fetchFee(); }, [fetchFee]);

  const handleMax = () => {
    if (balance !== null && feeSat !== null) {
      const max = Number(balance) - feeSat;
      if (max > 0) setAmount(String(max));
    }
  };

  const DUST_LIMIT_TAPROOT = 330; // sats, standard relay dust threshold for P2TR
  const canSign = parseInt(amount) >= DUST_LIMIT_TAPROOT && isValidAddress(recipient) && feeSat !== null && balance !== null && (parseInt(amount)+feeSat! <= parseInt(balance));

  // Copy debug log to clipboard
  const copyDebugLog = useCallback(() => {
    const text = debugLines.join('\n');
    Clipboard.setStringAsync(text);
    setFeedback('Debug log copied');
  }, [debugLines]);

  const buildAndSign = async () => {
    try {
      if (!account) return;
      setFeedback("Building transaction…");
      // Fetch UTXOs and aggregate until we cover send+fee
      const utxRes = await fetch(`https://mempool.space/api/address/${account.address}/utxo`);
      const utxos: any[] = await utxRes.json();
      log({ utxos });
      if (!utxos.length) throw new Error("No UTXOs");

      const feeVal = BigInt(feeSat || 0);
      const sendAmtNum = parseInt(amount);
      if (sendAmtNum < DUST_LIMIT_TAPROOT) {
        throw new Error(`Amount below dust limit (${DUST_LIMIT_TAPROOT} sats)`);
      }
      const sendVal = BigInt(sendAmtNum);

      // sort by value asc (smallest first) so we minimize change
      utxos.sort((a, b) => a.value - b.value);
      let selected: any[] = [];
      let totalIn = BigInt(0);
      for (const u of utxos) {
        selected.push(u);
        totalIn += BigInt(u.value);
        if (totalIn >= sendVal + feeVal) break;
      }
      if (totalIn < sendVal + feeVal) {
        throw new Error("Not enough funds to cover amount + fee");
      }

      // -------------------------------------------------------------------
      // 3. Determine taproot derivation once and reuse for every input
      // -------------------------------------------------------------------

      const taprootInternalKey = (account as any).taprootInternalKey;
      const taprootBip32Derivation = (account as any).taprootBip32Derivation;

      let tapIntKeyBytes = taprootInternalKey ? hexToBytes(taprootInternalKey) : undefined;
      let tapBip32 = taprootBip32Derivation;

      if (!tapIntKeyBytes || !tapBip32 || (Array.isArray(tapBip32) && tapBip32.length === 0)) {
        const pubBuf = Buffer.from(account.publicKey, 'hex');
        tapIntKeyBytes = pubBuf.length === 33 ? pubBuf.slice(1) : pubBuf; // x-only
        tapBip32 = [[tapIntKeyBytes, { hashes: [], der: { fingerprint: 0, path: bip32Path(`m/86'/0'/0'/0/${account.walletIndex}`) } }]];
        log('Injected fallback taproot derivation');
      }

      const tx = new Transaction();
      for (const inUtxo of selected) {
        // fetch parent tx once per utxo to get scriptPubKey and value (although value already here)
        const parent = await fetch(`https://mempool.space/api/tx/${inUtxo.txid}`).then(r=>r.json());
        const pvout = parent.vout[inUtxo.vout];
        if (!pvout) throw new Error("Parent vout not found");
        const scriptHex: string = pvout.scriptpubkey;
        const val: number = pvout.value;

        tx.addInput({
          txid: inUtxo.txid,
          index: inUtxo.vout,
          witnessUtxo: { script: hexToBytes(scriptHex), amount: BigInt(val) },
          tapInternalKey: tapIntKeyBytes,
          tapBip32Derivation: tapBip32,
        });
      }

      const changeVal = totalIn - sendVal - feeVal;
      tx.addOutputAddress(recipient, sendVal);
      if (changeVal > BigInt(0)) {
        log(`Change ${changeVal} sats treated as fee to avoid dust`);
      }
      const psbtHex = bytesToHex(tx.toPSBT());
      log({ psbtHex });
      setFeedback("Signing…");
      log("Calling provider.signTransaction …");
      const provider = await account.getProvider();
      const { signedTransaction } = await (provider as any).signTransaction({ psbt: psbtHex });
      log({ signedTransaction });
      setSignedTxHex(signedTransaction);
      setFeedback("Signed. Ready to broadcast.");
    } catch (e) {
      setFeedback(`Sign error: ${(e as any).message ?? e}`);
      log(`Sign error: ${(e as any).message ?? e}`);
      setSignedTxHex(null);
    }
  };

  const broadcast = async () => {
    if (!signedTxHex) return;
    try {
      setFeedback("Broadcasting…");
      log("Broadcasting raw tx …");
      const res = await fetch("https://mempool.space/api/tx", { method: "POST", body: signedTxHex });
      const txid = await res.text();
      if (res.status !== 200) throw new Error(txid);
      setFeedback(`Broadcasted ${txid}`);
      log(`Broadcasted ${txid}`);
      Linking.openURL(`https://mempool.space/tx/${txid}`);
    } catch (e) {
      setFeedback(`Broadcast error: ${(e as any).message ?? e}`);
      log(`Broadcast error: ${(e as any).message ?? e}`);
    }
  };

  // --- Debugging helpers ---
  // 1. Log wallet derivation info and UTXOs
  const debugLogWalletAndUtxos = async () => {
    log({ wallet: account });
    if (!account?.address) return log('No account.address');
    const utxRes = await fetch(`https://mempool.space/api/address/${account.address}/utxo`);
    const utxos = await utxRes.json();
    log({ utxos });
  };

  // 2. Try common Taproot derivations (simulate, log addresses)
  const debugTryCommonDerivations = async () => {
    // This is a placeholder: in Expo, we can't derive new keys without the seed/xprv
    // But we can log what we *would* try
    const indices = [0, 1, 2, 10, 20];
    indices.forEach(idx => {
      log({ tryPath: `m/86'/0'/0'/0/${idx}` });
    });
    log('NOTE: Expo SDK does not expose xprv/seed, so cannot derive addresses client-side.');
  };

  // 3. Test private key ownership by signing a message
  const debugTestKeyOwnership = async () => {
    try {
      if (!account) return log('No account');
      const provider = await account.getProvider();
      const message = 'Privy BTC debug test: ' + Date.now();
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        message,
        { encoding: Crypto.CryptoEncoding.HEX },
      );
      const { signature } = await (provider as any).sign({ hash });
      log({ message, hash, signature });
      log('You can verify this signature externally for the address.');
    } catch (e) {
      log('Key ownership test failed: ' + ((e as any)?.message ?? e));
    }
  };

  // 4. Build and log raw PSBT input
  const debugBuildPsbtInput = async () => {
    try {
      if (!account) return log('No account');
      const utxRes = await fetch(`https://mempool.space/api/address/${account.address}/utxo`);
      const utxos = await utxRes.json();
      if (!utxos.length) return log('No UTXOs');
      const useUtxo = utxos[0];
      const parentRes = await fetch(`https://mempool.space/api/tx/${useUtxo.txid}`);
      const parentJson = await parentRes.json();
      const vout = parentJson.vout[useUtxo.vout];
      const scriptHex: string = vout.scriptpubkey;
      const utxoValue: number = vout.value;
      const tx = new Transaction();
      tx.addInput({
        txid: useUtxo.txid,
        index: useUtxo.vout,
        witnessUtxo: { script: hexToBytes(scriptHex), amount: BigInt(utxoValue) },
        // No taproot fields (since SDK does not expose them)
      });
      log({ psbtInput: tx.getInput(0) });
      log({ psbtHex: bytesToHex(tx.toPSBT()) });
    } catch (e) {
      log('Build PSBT input failed: ' + ((e as any)?.message ?? e));
    }
  };

  // 5. Attempt to sign and log result
  const debugTrySignPsbt = async () => {
    try {
      if (!account) return log('No account');
      const utxRes = await fetch(`https://mempool.space/api/address/${account.address}/utxo`);
      const utxos = await utxRes.json();
      if (!utxos.length) return log('No UTXOs');
      const useUtxo = utxos[0];
      const parentRes = await fetch(`https://mempool.space/api/tx/${useUtxo.txid}`);
      const parentJson = await parentRes.json();
      const vout = parentJson.vout[useUtxo.vout];
      const scriptHex: string = vout.scriptpubkey;
      const utxoValue: number = vout.value;
      const tx = new Transaction();
      tx.addInput({
        txid: useUtxo.txid,
        index: useUtxo.vout,
        witnessUtxo: { script: hexToBytes(scriptHex), amount: BigInt(utxoValue) },
      });
      const sendVal = BigInt(utxoValue - 100); // send almost all, leave 100 sats as fee
      tx.addOutputAddress(account.address, sendVal);
      const psbtHex = bytesToHex(tx.toPSBT());
      log({ trySignPsbtHex: psbtHex });
      const provider = await account.getProvider();
      const result = await (provider as any).signTransaction({ psbt: psbtHex });
      log({ trySignResult: result });
    } catch (e) {
      log('Try sign PSBT failed: ' + ((e as any)?.message ?? e));
    }
  };

  // 6. Brute-force taprootInternalKey/taprootBip32Derivation
  const debugBruteForceTaproot = async () => {
    try {
      if (!account) return log('No account');

      // 1. Fetch a spendable UTXO
      const utxRes = await fetch(`https://mempool.space/api/address/${account.address}/utxo`);
      const utxos = await utxRes.json();
      if (!utxos.length) return log('No UTXOs');
      const useUtxo = utxos[0];

      // 2. Get scriptPubKey & value for witnessUtxo
      const parentRes = await fetch(`https://mempool.space/api/tx/${useUtxo.txid}`);
      const parentJson = await parentRes.json();
      const vout = parentJson.vout[useUtxo.vout];
      const scriptHex: string = vout.scriptpubkey;
      const utxoValue: number = vout.value;

      // 3. Prepare constants for brute-force
      const pubkeyBuf = Buffer.from(account.publicKey, 'hex');
      const xOnlyPubkey = pubkeyBuf.length === 33 ? pubkeyBuf.slice(1) : pubkeyBuf; // 32-byte x-only key

      // Common derivation templates to try
      const pathTemplates = [
        `m/86'/0'/0'/0/${account.walletIndex}`,
        `m/86'/0'/0'/${account.walletIndex}`,
        `m/86'/0'/0'/1/${account.walletIndex}`,
        `m/86'/0'/0'/${account.walletIndex}'`,
      ];

      // Fingerprint dictionary: 0s, common, and random values
      const fingerprints = [
        '00000000', 'd90c6a4f', 'f5acc2fd', '5c1bd648',
        '2c62ff1d', 'deadbeef', 'ffffffff', '12345678', 'abcdef12', 'cafebabe',
      ];

      outer: for (const pathStr of pathTemplates) {
        const pathArr = bip32Path(pathStr);
        for (const fpHex of fingerprints) {
          const fingerprintNum = parseInt(fpHex, 16) >>> 0; // ensure uint32

          const tx = new Transaction();
          tx.addInput({
            txid: useUtxo.txid,
            index: useUtxo.vout,
            witnessUtxo: {
              script: hexToBytes(scriptHex),
              amount: BigInt(utxoValue),
            },
            tapInternalKey: xOnlyPubkey,
            tapBip32Derivation: [[
              xOnlyPubkey, // KEY = 32-byte x-only pubkey
              {
                hashes: [],
                der: {
                  fingerprint: fingerprintNum,
                  path: pathArr,
                },
              },
            ]],
          });

          const psbtHex = bytesToHex(tx.toPSBT());
          logSafe({ attempt: { fp: fpHex, path: pathStr, psbtSize: psbtHex.length } });

          try {
            const provider = await account.getProvider();
            const result = await (provider as any).signTransaction({ psbt: psbtHex });
            logSafe({ result });
            if (result?.signedTransaction) {
              log('🎉 SUCCESS! fingerprint=' + fpHex + ' path=' + pathStr);
              break outer;
            }
          } catch (e: any) {
            log('Attempt failed: ' + (e?.message ?? e));
          }
        }
      }
    } catch (e) {
      log('Brute-force taproot failed: ' + ((e as any)?.message ?? e));
    }
  };

  // 7. Log scriptPubKey and compare to address
  const debugLogScriptPubKey = async () => {
    try {
      if (!account) return log('No account');
      const utxRes = await fetch(`https://mempool.space/api/address/${account.address}/utxo`);
      const utxos = await utxRes.json();
      if (!utxos.length) return log('No UTXOs');
      const useUtxo = utxos[0];
      const parentRes = await fetch(`https://mempool.space/api/tx/${useUtxo.txid}`);
      const parentJson = await parentRes.json();
      const vout = parentJson.vout[useUtxo.vout];
      logSafe({ scriptpubkey: vout.scriptpubkey, scriptpubkey_address: vout.scriptpubkey_address, walletAddress: account.address });
    } catch (e) {
      log('Log scriptPubKey failed: ' + ((e as any)?.message ?? e));
    }
  };

  // 8. Log output of address-to-scriptPubKey conversion for wallet address
  const debugAddressToScriptPubKey = async () => {
    try {
      if (!account) return log('No account');
      // Use bitcoinjs-lib or custom logic if available (not in Expo by default)
      log('Address-to-scriptPubKey conversion not implemented in Expo, but address is: ' + account.address);
    } catch (e) {
      log('Address-to-scriptPubKey failed: ' + ((e as any)?.message ?? e));
    }
  };

  // 9. Log hash160 of public key for legacy/segwit comparison
  const debugLogHash160 = async () => {
    try {
      if (!account) return log('No account');
      const pubkeyBuf = Buffer.from(account.publicKey, 'hex');
      // Use @noble/hashes for hash160 if available
      // const hash160 = ripemd160(sha256(pubkeyBuf));
      log('Hash160 not implemented in Expo, but publicKey is: ' + account.publicKey);
    } catch (e) {
      log('Log hash160 failed: ' + ((e as any)?.message ?? e));
    }
  };

  // Run all BTC debug tests in sequence
  const runAllBtcDebugTests = async () => {
    log('--- RUNNING ALL BTC DEBUG TESTS ---');
    await debugLogWalletAndUtxos();
    await debugTryCommonDerivations();
    await debugTestKeyOwnership();
    await debugBuildPsbtInput();
    await debugTrySignPsbt();
    await debugBruteForceTaproot();
    await debugLogScriptPubKey();
    await debugAddressToScriptPubKey();
    await debugLogHash160();
    log('--- END OF BTC DEBUG TESTS ---');
  };

  if (!user) {
    return null;
  }

  // Show Security Settings screen if toggled
  if (showSecuritySettings) {
    return (
      <View style={{ flex: 1 }}>
        <Button 
          title="← Back to Wallet" 
          onPress={() => setShowSecuritySettings(false)} 
        />
        <SecuritySettingsScreen />
      </View>
    );
  }

  return (
    <View>
      <Button title="Link Passkey" onPress={handleLinkPasskey} />
      
      {/* Add Security Settings button */}
      <Button 
        title="🔐 Wallet Export/Recovery" 
        onPress={() => setShowSecuritySettings(true)} 
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
                <Text style={{ fontWeight: "bold" }}>Bitcoin Wallet</Text>
                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
                  <Text selectable>{account.address}</Text>
                  <TouchableOpacity onPress={() => {
                    Clipboard.setStringAsync(account.address);
                    setFeedback("Address copied");
                  }}>
                    <Text style={{ color: "blue", marginLeft: 6 }}>Copy</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ marginVertical: 10 }}>
                  <QRCode value={account.address} size={120} />
                </View>
                <Text>
                  Balance: {balanceLoading && "Loading…"}
                  {!balanceLoading && balance !== null && `${balance} sats`}
                  {!balanceLoading && balance === null && balanceError && `Error`}
                  {!balanceLoading && balance === null && !balanceError && `N/A`}
                </Text>
                <Button title="Refresh Balance" onPress={fetchBalance} />

                {/* Send Bitcoin Section */}
                <View style={{ marginTop: 20, width: "100%", gap: 6 }}>
                  <Text style={{ fontWeight: "bold" }}>Send Bitcoin</Text>

                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TextInput
                      style={{ borderWidth: 1, flex: 1, padding: 6 }}
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="numeric"
                      placeholder="Amount (sats)"
                    />
                    <Button title="MAX" onPress={handleMax} />
                  </View>
                  <Text>
                    Fee: {feeLoading ? "Loading…" : feeSat !== null ? `${feeSat} sats` : "Error"}
                  </Text>

                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TextInput
                      style={{ borderWidth: 1, flex: 1, padding: 6 }}
                      value={recipient}
                      onChangeText={setRecipient}
                      placeholder="Recipient address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Button title="Paste" onPress={async () => {
                      const clip = await Clipboard.getStringAsync();
                      setRecipient(clip);
                    }} />
                  </View>
                  {!isValidAddress(recipient) && recipient.length > 0 && (
                    <Text style={{ color: "red" }}>Invalid address</Text>
                  )}

                  <Button title="Sign Transaction" onPress={buildAndSign} disabled={!canSign} />
                  <Button title="Broadcast" onPress={broadcast} disabled={!signedTxHex} />
                </View>
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
          {/* Developer Debug Log (scrollable) */}
          {debugLines.length > 0 && (
            <View style={{ maxHeight: 180, borderWidth: 1, borderColor: "#ccc", marginVertical: 10 }}>
              <ScrollView>
                {debugLines.map((l, i) => (
                  <Text key={i} style={{ fontSize: 10, color: "#555" }} selectable>
                    {l}
                  </Text>
                ))}
              </ScrollView>
              <Button title="Copy Debug Log" onPress={copyDebugLog} />
              <Button title="Run All BTC Debug Tests" onPress={runAllBtcDebugTests} />
            </View>
          )}
          <Button title="Logout" onPress={logout} />
        </View>
      </ScrollView>
    </View>
  );
};
