import React, { useState } from "react";
import { Button } from "@ui/components/Button";

type AuthViewProps = {
  onAuthenticated: () => void;
};

type Mode = "login" | "register";

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const title = mode === "login" ? "Welcome back!" : "Create an account";
  const subtitle =
    mode === "login"
      ? "We're so excited to see you again!"
      : "Join the party with your friends.";

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }
    // mock-only: always succeed
    onAuthenticated();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_#1e293b,_#020617)]">
      <div className="w-full max-w-md bg-slate-900/80 rounded-lg shadow-xl px-8 py-10 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-slate-400 text-sm">{subtitle}</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1 text-sm">
            <label className="block text-slate-300 font-semibold">
              USERNAME
            </label>
            <input
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="block text-slate-300 font-semibold">
              PASSWORD
            </label>
            <input
              type="password"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
          {error && (
            <p className="text-xs text-red-400 font-medium">{error}</p>
          )}

          <Button type="submit" className="w-full mt-2">
            {mode === "login" ? "Log In" : "Continue"}
          </Button>
        </form>

        <p className="text-xs text-slate-400 text-center">
          {mode === "login" ? "Need an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={toggleMode}
            className="text-indigo-400 hover:underline font-medium"
          >
            {mode === "login" ? "Register" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
};

