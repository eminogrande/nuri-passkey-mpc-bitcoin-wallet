import { SafeAreaView, Text, View, StyleSheet } from "react-native"; // Added StyleSheet
import Constants from "expo-constants";
import LoginScreen from "@/components/LoginScreen";
import { usePrivy } from "@privy-io/expo";
import { UserScreen } from "@/components/UserScreen";
import React, { useState } from "react"; // Added React and useState
import DebugLog from "../components/DebugLog"; // Import DebugLog
import LoggingContext from "../context/LoggingContext"; // Import LoggingContext

export default function Index() {
  const { user } = usePrivy();
  // State variable to store an array of log messages.
  // These logs are displayed by the DebugLog component.
  const [logs, setLogs] = useState<string[]>([]);
  // State variable to store the current application error, if any.
  // This error is displayed by the DebugLog component.
  const [currentError, setCurrentError] = useState<any | null>(null);

  // Function to add a new log message to the `logs` state.
  // Each log message is timestamped with the current ISO date and time.
  const addLog = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, `${new Date().toISOString()}: ${message}`]);
  };

  // Function to set the `currentError` state with a new error.
  // It also adds the error message to the logs.
  const setAppError = (error: any) => {
    setCurrentError(error);
    // Logs the error message, or 'Unknown error' if the error message is not available.
    addLog(`Error: ${error?.message || 'Unknown error'}`);
  };

  if ((Constants.expoConfig?.extra?.privyAppId as string).length !== 25) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <View style={styles.centered}>
          <Text>You have not set a valid `privyAppId` in app.json</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (
    !(Constants.expoConfig?.extra?.privyClientId as string).startsWith(
      "client-"
    )
  ) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <View style={styles.centered}>
          <Text>You have not set a valid `privyClientId` in app.json</Text>
        </View>
      </SafeAreaView>
    );
  }

  const AppContent = () => (!user ? <LoginScreen /> : <UserScreen />);

  return (
    // LoggingContext.Provider makes the `addLog` and `setAppError` functions
    // available to all components rendered within its tree.
    <LoggingContext.Provider value={{ addLog, setAppError }}>
      <SafeAreaView style={styles.flexContainer}>
        <View style={styles.mainContent}>
          <AppContent />
        </View>
        {/* The DebugLog component is rendered here to display all collected logs and the current error.
            It receives the `logs` array and the `currentError` object as props. */}
        <View style={styles.debugLogContainer}>
          <DebugLog logs={logs} error={currentError} />
        </View>
      </SafeAreaView>
    </LoggingContext.Provider>
  );
}

// Added StyleSheet
const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  mainContent: {
    flex: 1, // Takes up most of the space
  },
  debugLogContainer: {
    height: '20%', // Adjust height as needed
    maxHeight: 150, // Optional: Set a max height
    borderTopWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 5, // Add some padding
  },
  errorContainer: { // Style for the error messages about privyAppId/privyClientId
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }
});
