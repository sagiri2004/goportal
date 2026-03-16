import React, { useState, useEffect } from "react";
import { AppShell } from "./layout/AppShell";
import { AuthView } from "@features/auth/AuthView";
import { DashboardView } from "@features/dashboard/DashboardView";

type AuthState = {
  isAuthenticated: boolean;
};

const AUTH_STORAGE_KEY = "dc_auth_state";

function loadAuthState(): AuthState {
  if (typeof window === "undefined") return { isAuthenticated: false };
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { isAuthenticated: false };
    const parsed = JSON.parse(raw) as AuthState;
    return parsed;
  } catch {
    return { isAuthenticated: false };
  }
}

function saveAuthState(state: AuthState) {
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ isAuthenticated: false });

  useEffect(() => {
    setAuth(loadAuthState());
  }, []);

  const handleLoginSuccess = () => {
    const next = { isAuthenticated: true };
    setAuth(next);
    saveAuthState(next);
  };

  const handleLogout = () => {
    const next = { isAuthenticated: false };
    setAuth(next);
    saveAuthState(next);
  };

  if (!auth.isAuthenticated) {
    return <AuthView onAuthenticated={handleLoginSuccess} />;
  }

  return (
    <AppShell>
      <DashboardView onLogout={handleLogout} />
    </AppShell>
  );
};


