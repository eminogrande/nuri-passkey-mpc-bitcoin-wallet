import React from 'react';
import { Modal, View, Text, Button, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons'; // Assuming Ionicons is available

interface ExportKeyModalProps {
  isVisible: boolean;
  onClose: () => void;
  exportPayload: string | null;
}

export default function ExportKeyModal({ isVisible, onClose, exportPayload }: ExportKeyModalProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (exportPayload) {
      await Clipboard.setStringAsync(exportPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    }
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
          <Text style={styles.modalTitle}>Exported Key Payload</Text>
          <Text style={styles.modalSubtitle}>Save this payload securely. You'll need it to decrypt your key.</Text>

          <ScrollView style={styles.payloadScrollView}>
            <Text selectable style={styles.payloadText}>{exportPayload}</Text>
          </ScrollView>

          <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
            <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={20} color="white" />
            <Text style={styles.copyButtonText}>{copied ? 'Copied!' : 'Copy to Clipboard'}</Text>
          </TouchableOpacity>

          <Button title="Close" onPress={onClose} />
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  payloadScrollView: {
    maxHeight: 200, // Adjust as needed
    width: '100%',
    borderColor: '#eee',
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#f8f8f8',
  },
  payloadText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  copyButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
  },
});
