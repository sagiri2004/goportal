import React, { useMemo, useState } from "react";
import { Button } from "@ui/components/Button";
import {
  mockChannels,
  mockCurrentUser,
  mockMessages,
  mockServers,
  mockUsers,
} from "./mockData";
import type { Channel } from "@types/models";

type DashboardViewProps = {
  onLogout: () => void;
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onLogout }) => {
  const [activeServerId, setActiveServerId] = useState<string>("s1");
  const [activeChannelId, setActiveChannelId] = useState<string>("c1");

  const channelsForServer = useMemo(
    () => mockChannels.filter((c) => c.serverId === activeServerId),
    [activeServerId]
  );

  const activeMessages = useMemo(
    () => mockMessages.filter((m) => m.channelId === activeChannelId),
    [activeChannelId]
  );

  const activeChannel = useMemo(
    () => mockChannels.find((c) => c.id === activeChannelId) as Channel | undefined,
    [activeChannelId]
  );

  return (
    <div className="h-screen flex">
      {/* Servers rail */}
      <aside className="w-16 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-3 space-y-3">
        {mockServers.map((server) => {
          const isActive = server.id === activeServerId;
          return (
            <button
              key={server.id}
              className={`w-12 h-12 rounded-3xl flex items-center justify-center text-sm font-semibold transition-all ${
                isActive
                  ? "bg-indigo-600 text-white rounded-2xl"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
              onClick={() => setActiveServerId(server.id)}
            >
              {server.initials}
            </button>
          );
        })}
      </aside>

      {/* Channel list + footer */}
      <aside className="w-64 bg-slate-900 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between text-sm font-semibold">
          <span className="truncate">
            {mockServers.find((s) => s.id === activeServerId)?.name ?? "Server"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2 text-xs text-slate-400">
          <p className="uppercase tracking-wide text-[10px] px-2 text-slate-500">
            Text Channels
          </p>
          {channelsForServer
            .filter((c) => c.type === "text")
            .map((channel) => {
              const isActive = channel.id === activeChannelId;
              return (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannelId(channel.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors ${
                    isActive
                      ? "bg-slate-700 text-slate-50"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  }`}
                >
                  <span className="text-slate-500">#</span>
                  <span className="truncate">{channel.name}</span>
                </button>
              );
            })}
        </div>

        <div className="border-t border-slate-800 px-2 py-2 flex items-center gap-2 text-xs">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{ backgroundColor: mockCurrentUser.avatarColor }}
          >
            {mockCurrentUser.username[0]?.toUpperCase()}
          </div>
          <div className="flex-1 truncate">
            <div className="text-slate-100 text-xs truncate">
              {mockCurrentUser.username}
            </div>
            <div className="text-slate-500 text-[11px]">Online</div>
          </div>
          <Button
            className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600"
            onClick={onLogout}
          >
            Log out
          </Button>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex-1 bg-slate-800 flex flex-col">
        <header className="h-12 border-b border-slate-700 px-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">#</span>
            <span className="font-semibold">
              {activeChannel?.name ?? "channel"}
            </span>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm">
          {activeMessages.map((msg) => {
            const author = mockUsers.find((u) => u.id === msg.authorId);
            return (
              <div key={msg.id} className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5"
                  style={{ backgroundColor: author?.avatarColor ?? "#64748b" }}
                >
                  {author?.username[0]?.toUpperCase()}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-slate-100 text-sm">
                      {author?.username ?? "unknown"}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {msg.timestamp}
                    </span>
                  </div>
                  <p className="text-slate-100">{msg.content}</p>
                </div>
              </div>
            );
          })}
        </section>

        <footer className="h-16 px-4 pb-4 flex items-end">
          <div className="w-full bg-slate-900/80 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-100 flex items-center">
            <span className="text-slate-500 mr-2">Message</span>
            <span className="text-slate-600 text-xs">
              (input disabled in mock)
            </span>
          </div>
        </footer>
      </main>

      {/* Member list */}
      <aside className="w-60 bg-slate-900 border-l border-slate-800 flex flex-col">
        <div className="h-12 border-b border-slate-800 px-3 flex items-center text-xs font-semibold text-slate-400">
          MEMBERS — {mockUsers.length}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 text-xs">
          {mockUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
                style={{ backgroundColor: u.avatarColor }}
              >
                {u.username[0]?.toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-slate-100 text-xs">{u.username}</span>
                <span className="text-slate-500 text-[10px] capitalize">
                  {u.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
};

