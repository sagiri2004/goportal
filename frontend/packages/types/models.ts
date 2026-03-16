export type User = {
  id: string;
  username: string;
  avatarColor: string;
  status: "online" | "offline" | "idle" | "dnd";
};

export type Message = {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  timestamp: string;
};

export type Channel = {
  id: string;
  serverId: string;
  name: string;
  type: "text" | "voice";
};

export type Server = {
  id: string;
  name: string;
  initials: string;
};

