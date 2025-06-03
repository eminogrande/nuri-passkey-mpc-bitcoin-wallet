import React, { useState, useEffect } from 'react';
import { View, Button, TextInput, Text, StyleSheet, ScrollView, ActivityIndicator, AppState, Platform } from 'react-native';
import { useWalletExport } from '../../hooks/useWalletExport';
import { useWalletDecrypt, DecryptedKeyInfo } from '../../hooks/useWalletDecrypt';
import ExportKeyModal from '../modals/ExportKeyModal';
import ShowKeyModal from '../modals/ShowKeyModal';

export default function SecuritySettingsScreen() {
  const { onExport, exportLoading, exportError, exportResult, setExportResult, setExportError: setExportHookError } = useWalletExport();
  const {
    onDecrypt,
    decryptLoading,
    decryptError,
    decryptedKeyInfo,
    keyMatchStatus,
    clearSensitiveData,
    setDecryptError: setDecryptHookError,
    setDecryptedKeyInfo,
    setKeyMatchStatus
  } = useWalletDecrypt();

  const [exportPayloadInput, setExportPayloadInput] = useState('');
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [isShowKeyModalVisible, setIsShowKeyModalVisible] = useState(false);

  useEffect(() => {
    if (exportResult) {
      setIsExportModalVisible(true);
    }
  }, [exportResult]);

  useEffect(() => {
    if (decryptedKeyInfo || (decryptError && keyMatchStatus === false) || (decryptError && keyMatchStatus === null && !decryptedKeyInfo) ) {
      setIsShowKeyModalVisible(true);
    }
  }, [decryptedKeyInfo, decryptError, keyMatchStatus]);

  // Clear decrypted key if app goes to background while modal is visible
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState.match(/inactive|background/) && isShowKeyModalVisible) {
        clearSensitiveData();
        // Optionally close the modal too, or let it be blank when app returns
        setIsShowKeyModalVisible(false);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [isShowKeyModalVisible, clearSensitiveData]);

  const handleExport = async () => {
    await onExport();
  };

  const handleDecrypt = async () => {
    if (exportPayloadInput.trim() === '') {
      setDecryptHookError(new Error('Please paste the export payload.'));
      setIsShowKeyModalVisible(true); // Show modal to display this error
      return;
    }
    try {
      JSON.parse(exportPayloadInput); // Validate JSON
      await onDecrypt(exportPayloadInput);
    } catch (e) {
      setDecryptHookError(new Error('Invalid JSON payload.'));
      setIsShowKeyModalVisible(true); // Show modal to display this error
    }
  };

  const closeExportModal = () => {
    setIsExportModalVisible(false);
    setExportResult(null); // Clear result after modal is closed
    setExportHookError(null);
  }

  const closeShowKeyModal = () => {
    setIsShowKeyModalVisible(false);
    clearSensitiveData(); // Ensure data is cleared
    setDecryptHookError(null);
    setDecryptedKeyInfo(null);
    setKeyMatchStatus(null);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Wallet Key Management</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Encrypted Key</Text>
        <Button title="Export Key" onPress={handleExport} disabled={exportLoading} />
        {exportLoading && <ActivityIndicator size="small" />}
        {exportError && <Text style={styles.errorText}>Export Error: {exportError.message}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Decrypt Key</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste Export Payload JSON here"
          value={exportPayloadInput}
          onChangeText={setExportPayloadInput}
          multiline
          numberOfLines={4}
          editable={!decryptLoading}
        />
        <Button title="Decrypt Key" onPress={handleDecrypt} disabled={decryptLoading || exportPayloadInput.trim() === ''} />
        {decryptLoading && <ActivityIndicator size="small" />}
        {/* Decrypt error is shown in the ShowKeyModal */}
      </View>

      {exportResult && (
        <ExportKeyModal
          isVisible={isExportModalVisible}
          onClose={closeExportModal}
          exportPayload={exportResult}
        />
      )}

      {(isShowKeyModalVisible) && (
         <ShowKeyModal
            isVisible={isShowKeyModalVisible}
            onClose={closeShowKeyModal}
            decryptedKeyInfo={decryptedKeyInfo}
            keyMatchStatus={keyMatchStatus}
            error={decryptError}
         />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: 'red',
    marginTop: 5,
  },
});
