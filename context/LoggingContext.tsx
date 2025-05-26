import React, { createContext, useContext } from 'react';

/**
 * @file LoggingContext.tsx
 * @description This file defines the LoggingContext and the useLogging hook.
 * The LoggingContext is used to provide logging-related functions (addLog, setAppError)
 * to various components within the application without prop drilling.
 * This allows any component in the tree to easily log messages or report errors
 * to a central logging system, which in this case, is managed in `app/index.tsx`
 * and displayed via the `DebugLog` component.
 */

/**
 * @interface LoggingContextType
 * @description Defines the shape of the context value provided by LoggingContext.
 * @property {(message: string) => void} addLog - Function to add a log message.
 * @property {(error: any) => void} setAppError - Function to set the application-wide error.
 */
interface LoggingContextType {
  addLog: (message: string) => void;
  setAppError: (error: any) => void;
}

/**
 * @const LoggingContext
 * @description React Context object for logging.
 * It is initialized with `undefined` and will be provided a value
 * by a `LoggingContext.Provider` higher up in the component tree (e.g., in `app/index.tsx`).
 * Consumers of this context will receive an object matching `LoggingContextType`.
 */
const LoggingContext = createContext<LoggingContextType | undefined>(undefined);

/**
 * @function useLogging
 * @description A custom React hook that provides an easy way to access the LoggingContext.
 * It uses `useContext` to get the current value of `LoggingContext`.
 * @throws {Error} If the hook is used outside of a component wrapped by `LoggingContext.Provider`.
 * @returns {LoggingContextType} The context value, containing `addLog` and `setAppError` functions.
 */
export const useLogging = () => {
  const context = useContext(LoggingContext);
  // Ensure the hook is used within a provider. If context is undefined, it means
  // no provider is higher up in the tree, which is a developer error.
  if (!context) {
    throw new Error('useLogging must be used within a LoggingProvider');
  }
  return context;
};

export default LoggingContext;
