import { Configuration, PopupRequest } from "@azure/msal-browser";

// Get the current origin dynamically (works for both development and production)
// This ensures the redirect URI matches the current deployment URL
const getRedirectUri = (): string => {
  // Priority 1: Use environment variable if explicitly set
  if (import.meta.env.VITE_REDIRECT_URI) {
    return import.meta.env.VITE_REDIRECT_URI;
  }
  
  // Priority 2: Use current window origin (works automatically for any deployment)
  // - Development: http://localhost:5173
  // - Production: https://your-site.netlify.app
  // - Custom domain: https://yourdomain.com
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  
  if (!origin) {
    console.warn('Unable to determine redirect URI from window.location.origin');
    return '';
  }
  
  return origin;
};

// MSAL configuration
// IMPORTANT: Make sure your Azure AD app registration includes all redirect URIs:
// - http://localhost:5173 (for development)
// - https://your-site.netlify.app (for Netlify production)
// - https://yourdomain.com (if using custom domain)
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "",
    authority: import.meta.env.VITE_AZURE_AUTHORITY || "https://login.microsoftonline.com/common",
    redirectUri: getRedirectUri(),
    postLogoutRedirectUri: getRedirectUri(),
    // Navigate to login request url instead of popup
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: "sessionStorage", // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
  },
};

// Add scopes here for ID token to be used at Microsoft identity platform endpoints.
export const loginRequest: PopupRequest = {
  scopes: ["User.Read"],
  prompt: "login", // Force re-authentication - this will trigger biometric prompt
};

// Add the endpoints here for Microsoft Graph API services you'd like to use.
export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
};

