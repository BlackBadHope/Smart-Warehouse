
import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app'; 
import 'firebase/compat/auth'; 

import InventoryApp from './InventoryApp';
import { UserProfile } from './types';
import { ASCII_COLORS, FIREBASE_CONFIG_ERROR } from './constants'; 
import * as firebaseService from './services/firebaseService';
import { LogIn, RefreshCw } from 'lucide-react'; 

const App: React.FC = () => {
  const [authInfo, setAuthInfo] = useState<{ 
    status: 'loading' | 'authenticated' | 'unauthenticated' | 'error'; 
    user: firebase.User | null; 
    profile: UserProfile | null;
    errorMsg?: string; 
  }>({
    status: 'loading',
    user: null,
    profile: null,
  });

  useEffect(() => {
    // Initial error checks (config, Firebase init)
    if (FIREBASE_CONFIG_ERROR) {
      setAuthInfo({ 
        status: 'error', 
        user: null, 
        profile: null, 
        errorMsg: `Firebase Configuration Error: ${FIREBASE_CONFIG_ERROR}. Please ensure __firebase_config is correctly set.` 
      });
      return;
    }

    const fbInitError = firebaseService.getFirebaseInitializationError();
    if (fbInitError) {
      setAuthInfo({ 
        status: 'error', 
        user: null, 
        profile: null, 
        errorMsg: `Firebase Initialization Error: ${fbInitError}. Check console for details.`
      });
      return;
    }

    setAuthInfo(prev => ({ ...prev, status: 'loading' })); // General loading state initially

    let unsubAuthState: (() => void) | null = null;

    const processAuthentication = async () => {
      try {
        // It's crucial to process the redirect result first.
        // Firebase internally uses this to update its session state.
        // This call itself might not return the user directly if onAuthStateChanged handles it,
        // but it ensures Firebase is aware of the redirect attempt.
        await firebaseService.getGoogleRedirectResult();
        // After getGoogleRedirectResult has been processed (even if it returns null for no pending redirect),
        // onAuthStateChanged should now have the most up-to-date user state.
      } catch (error) {
        // This catch is for errors specifically from getGoogleRedirectResult itself,
        // though the service function is designed to return null on error rather than throw.
        console.error("[App.tsx] Error processing redirect result in useEffect:", error);
        setAuthInfo({
            status: 'error',
            user: null,
            profile: null,
            errorMsg: `Error during sign-in process: ${error instanceof Error ? error.message : String(error)}`
        });
        return; // Stop further auth processing if redirect handling itself failed critically
      }

      // Now, subscribe to auth state changes. This will also give the initial state.
      // onAuthStateChanged is the single source of truth for the user object.
      unsubAuthState = firebaseService.onAuthStateChanged((user) => {
        if (user) {
            const profile: UserProfile = {
            username: user.displayName || user.email || 'User',
            currency: 'USD', 
            };
            setAuthInfo({ status: 'authenticated', user, profile, errorMsg: undefined });
        } else {
            // If no user, and we were 'loading' (not from a redirect error), switch to 'unauthenticated'
            // If an error was already set (e.g., by FIREBASE_CONFIG_ERROR), preserve it.
            setAuthInfo(prev => ({
                ...prev,
                status: prev.status === 'error' ? 'error' : 'unauthenticated', 
                user: null,
                profile: null,
                // Do not clear errorMsg if status is already 'error'
                errorMsg: prev.status === 'error' ? prev.errorMsg : undefined 
            }));
        }
      });
    };

    processAuthentication();

    return () => {
      if (unsubAuthState) {
        unsubAuthState();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const handleGoogleSignIn = async () => {
    setAuthInfo(prev => ({ ...prev, status: 'loading', errorMsg: undefined })); 
    try {
      await firebaseService.signInWithGoogle();
      // Page will redirect, result handled by getGoogleRedirectResult on reload via useEffect
    } catch (error) {
      console.error("[App.tsx] Google Sign-In initiation failed:", error);
      let specificErrorMsg = `Google Sign-In initiation failed: ${error instanceof Error ? error.message : String(error)}`;
       if (error instanceof Error && (error as firebase.auth.Error).code === 'auth/operation-not-supported-in-this-environment') {
        specificErrorMsg = "Google Sign-In (using redirect) is not supported in the current environment or web storage is disabled. This can happen in sandboxed iframes. Try in a standard browser environment.";
      }
      setAuthInfo({ 
        status: 'error', 
        user: null, 
        profile: null, 
        errorMsg: specificErrorMsg
      });
    }
  };

  if (authInfo.status === 'loading') {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen ${ASCII_COLORS.bg} ${ASCII_COLORS.text}`}>
        <RefreshCw className="w-12 h-12 animate-spin text-yellow-400 mb-4" />
        <p className="text-xl">
          [ INITIALIZING SESSION & PROCESSING SIGN-IN... ]
        </p>
        <p className="text-sm mt-2">Please wait.</p>
      </div>
    );
  }

  if (authInfo.status === 'error') {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen ${ASCII_COLORS.bg} ${ASCII_COLORS.error} p-4 text-center`}>
        <h2 className="text-2xl font-bold mb-4">[ APPLICATION ERROR ]</h2>
        <p className="text-lg mb-2">Could not proceed due to an error:</p>
        <p className="text-md font-mono bg-black bg-opacity-30 p-3 rounded-md max-w-2xl break-words">
          {authInfo.errorMsg || "An unknown error occurred. Please check the browser console and ensure Firebase is correctly configured."}
        </p>
        <p className="mt-4">Please check the browser's developer console for more details. Ensure Firebase configuration (<code>__firebase_config</code>) is correctly set and the Gemini API Key (<code>API_KEY</code>) is available as an environment variable.</p>
        {(authInfo.errorMsg?.includes("Sign-In") || authInfo.errorMsg?.includes("Authentication") || authInfo.errorMsg?.includes("auth/operation-not-supported")) && (
          <button
            onClick={handleGoogleSignIn}
            className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.accent} p-3 px-6 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} text-lg mt-6 flex items-center`}
          >
            <LogIn className="mr-2" /> Try Sign In With Google Again
          </button>
        )}
         <button
            onClick={() => window.location.reload()}
            className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} p-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} mt-4`}
          >
            Refresh Page
          </button>
      </div>
    );
  }
  
  if (authInfo.status === 'unauthenticated') {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen ${ASCII_COLORS.bg} ${ASCII_COLORS.text}`}>
        <h1 className={`${ASCII_COLORS.accent} text-4xl font-bold mb-8`}>[ INVENTORY OS ]</h1>
        <p className="mb-6 text-lg">Please sign in to continue.</p>
        <button
          onClick={handleGoogleSignIn}
          className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.accent} p-3 px-6 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} text-lg flex items-center`}
        >
          <LogIn className="mr-2" /> Sign In With Google
        </button>
      </div>
    );
  }

  if (authInfo.status === 'authenticated' && authInfo.user && authInfo.profile) {
    return <InventoryApp user={authInfo.user} userProfile={authInfo.profile} />;
  }

  // Fallback for any unexpected state, should ideally not be reached.
  return (
    <div className={`flex items-center justify-center min-h-screen ${ASCII_COLORS.bg} ${ASCII_COLORS.text}`}>
      <p className="text-xl animate-pulse">[ UNEXPECTED STATE: Please refresh or check console. Status: {authInfo.status} ]</p>
    </div>
  );
};

export default App;
