import React, { createContext, useContext, useEffect, useState } from "react";
import {
  PublicClientApplication,
  AccountInfo,
  AuthenticationResult,
} from "@azure/msal-browser";
import { msalConfig, loginRequest } from "../lib/authConfig";

interface AuthContextType {
  account: AccountInfo | null;
  isAuthenticated: boolean;
  token: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize MSAL with dynamic configuration
// The redirect URI is set based on the current deployment URL
const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL (will be called in useEffect)
let msalInitialized = false;
const initializeMsal = async () => {
  if (!msalInitialized) {
    await msalInstance.initialize();
    msalInitialized = true;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Initialize MSAL and check for existing accounts on mount
    const init = async () => {
      await initializeMsal();
      
      // Handle redirect response (if using redirect flow)
      try {
        const response = await msalInstance.handleRedirectPromise();
        if (response) {
          // User just logged in via redirect
          setAccount(response.account);
          setToken(response.accessToken);
          localStorage.setItem("msal_access_token", response.accessToken);
          localStorage.setItem("msal_account", JSON.stringify(response.account));
          return;
        }
      } catch (error) {
        console.error("Error handling redirect:", error);
      }
      
      // Check for existing accounts
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        // Try to get token silently
        getAccessTokenSilent(accounts[0]);
      } else {
        // Check localStorage for cached account
        const cachedAccount = localStorage.getItem("msal_account");
        if (cachedAccount) {
          try {
            const account = JSON.parse(cachedAccount);
            setAccount(account);
            const cachedToken = localStorage.getItem("msal_access_token");
            if (cachedToken) {
              setToken(cachedToken);
            } else {
              getAccessTokenSilent(account);
            }
          } catch (error) {
            console.error("Failed to parse cached account:", error);
          }
        }
      }
    };
    init();
  }, []);

  const getAccessTokenSilent = async (account: AccountInfo) => {
    try {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: account,
      });
      setToken(response.accessToken);
      // Store token in localStorage for API client
      localStorage.setItem("msal_access_token", response.accessToken);
    } catch (error) {
      console.error("Failed to acquire token silently:", error);
      // If silent token acquisition fails, user may need to login again
      setToken(null);
      localStorage.removeItem("msal_access_token");
    }
  };

  const login = async () => {
    try {
      // Clear any cached accounts to force fresh login
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        // Clear the account from cache
        await msalInstance.removeAccount(accounts[0]);
      }
      
      // Clear localStorage cache
      localStorage.removeItem("msal_access_token");
      localStorage.removeItem("msal_account");
      
      // Force login with prompt - this will trigger biometric authentication
      const response: AuthenticationResult = await msalInstance.loginPopup({
        ...loginRequest,
        prompt: "login", // Force re-authentication
      });
      
      setAccount(response.account);
      setToken(response.accessToken);
      localStorage.setItem("msal_access_token", response.accessToken);
      localStorage.setItem("msal_account", JSON.stringify(response.account));
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await msalInstance.logoutPopup({
        account: account || undefined,
      });
      setAccount(null);
      setToken(null);
      localStorage.removeItem("msal_access_token");
      localStorage.removeItem("msal_account");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    if (!account) {
      return null;
    }

    // Check if we have a cached token
    if (token) {
      return token;
    }

    try {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: account,
      });
      setToken(response.accessToken);
      localStorage.setItem("msal_access_token", response.accessToken);
      return response.accessToken;
    } catch (error) {
      console.error("Failed to acquire token:", error);
      // If silent acquisition fails, try popup
      try {
        const response = await msalInstance.acquireTokenPopup(loginRequest);
        setToken(response.accessToken);
        localStorage.setItem("msal_access_token", response.accessToken);
        return response.accessToken;
      } catch (popupError) {
        console.error("Failed to acquire token via popup:", popupError);
        return null;
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        account,
        isAuthenticated: !!account && !!token,
        token,
        login,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

