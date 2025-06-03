import React from 'react';
import { Modal, View, Text, Button, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { DecryptedKeyInfo } from '../../hooks/useWalletDecrypt'; // Assuming type is exported
import { Ionicons } from '@expo/vector-icons';

interface ShowKeyModalProps {
  isVisible: boolean;
  onClose: () => void;
  decryptedKeyInfo: DecryptedKeyInfo | null;
  keyMatchStatus: boolean | null;
  error: Error | null;
}

export default function ShowKeyModal({
  isVisible,
  onClose,
  decryptedKeyInfo,
  keyMatchStatus,
  error
}: ShowKeyModalProps) {

  const renderContent = () => {
    if (error) {
      return (
        <View style={styles.statusContainer}>
          <Ionicons name="alert-circle-outline" size={32} color="red" />
          <Text style={[styles.statusText, styles.errorText]}>Error: {error.message}</Text>
        </View>
      );
    }

    if (decryptedKeyInfo && keyMatchStatus === true) {
      return (
        <>
          <View style={[styles.statusContainer, styles.successContainer]}>
            <Ionicons name="checkmark-circle-outline" size={32} color="green" />
            <Text style={[styles.statusText, styles.successText]}>Key Matches Current Wallet!</Text>
          </View>
          <Text style={styles.keyLabel}>Private Key (Hex):</Text>
          <Text selectable style={styles.keyText}>{decryptedKeyInfo.hex}</Text>
          <Text style={styles.keyLabel}>Private Key (WIF):</Text>
          <Text selectable style={styles.keyText}>{decryptedKeyInfo.wif}</Text>
          <Text style={styles.warningText}>
            This key is sensitive. Clear it from view once you're done. It will automatically clear in 60 seconds.
          </Text>
        </>
      );
    }

    if (keyMatchStatus === false) {
      return (
         <View style={styles.statusContainer}>
          <Ionicons name="close-circle-outline" size={32} color="red" />
          <Text style={[styles.statusText, styles.errorText]}>Key Mismatch: Decrypted key does not match current wallet.</Text>
        </View>
      );
    }

    // Should not happen if modal logic in parent is correct, but as a fallback:
    return <Text>No information to display.</Text>;
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Decrypted Wallet Key</Text>
          {renderContent()}
          <Button title="Close & Clear Key" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 15,
    width: '100%',
  },
  successContainer: {
    backgroundColor: '#e6fffa', // Light green
    borderColor: '#38a169', // Green
    borderWidth: 1,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  successText: {
    color: '#2f855a', // Darker green
  },
  errorText: {
    color: 'red',
  },
  keyLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  keyText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 12,
    padding: 8,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: '#f8f8f8',
    marginTop: 5,
    width: '100%',
    textAlign: 'left',
  },
  warningText: {
    fontSize: 12,
    color: '#718096', // Gray
    marginTop: 15,
    textAlign: 'center',
  },
});
