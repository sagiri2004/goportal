import React from "react";

type AppShellProps = {
  children: React.ReactNode;
};

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {children}
    </div>
  );
};


