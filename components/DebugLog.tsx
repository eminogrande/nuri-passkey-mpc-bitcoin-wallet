import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';

/**
 * @interface DebugLogProps
 * @description Props for the DebugLog component.
 * @property {string[]} logs - An array of log messages to display.
 * @property {Error | null | undefined} error - An optional error object to display.
 */
interface DebugLogProps {
  /**
   * logs: An array of strings, where each string is a log message.
   * These messages will be displayed in chronological order.
   */
  logs: string[];
  /**
   * error: An optional Error object (or null/undefined).
   * If provided, its message, code (if present), and stack trace (if present) will be displayed.
   */
  error?: Error | any | null; // Using 'any' for error to accommodate different error structures.
}

/**
 * @component DebugLog
 * @description A React Native component designed to display a scrollable list of log messages
 * and details of an error, if one is provided. This component is primarily used for
 * debugging purposes within the application, offering a visual feedback mechanism
 * for events and errors occurring during runtime.
 */
const DebugLog: React.FC<DebugLogProps> = ({ logs, error }) => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Map through the logs array and render each log message as a Text component. */}
        {logs.map((log, index) => (
          <Text key={`log-${index}`} style={styles.logText}>
            {log}
          </Text>
        ))}
        {/* If an error object is present, display its details. */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Error:</Text>
            {/* Display the error message. */}
            <Text style={styles.errorText}>Message: {error.message}</Text>
            {/* Display the error code, if available (using @ts-ignore as 'code' is not standard on Error). */}
            {/* @ts-ignore */}
            {error.code && <Text style={styles.errorText}>Code: {error.code}</Text>}
            {/* Display the error stack trace, if available. */}
            {error.stack && <Text style={styles.errorText}>Stack: {error.stack}</Text>}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    margin: 10,
    backgroundColor: '#f9f9f9',
  },
  scrollView: {
    flex: 1,
  },
  logText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 5,
  },
  errorContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'red',
    marginBottom: 5,
  },
  errorText: {
    fontSize: 12,
    color: 'red',
    marginBottom: 3,
  },
});

export default DebugLog;
