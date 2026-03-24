// packages/types/src/api.ts
// All API DTOs and error code constants. Append per domain — never overwrite.

// ---------------------------------------------------------------------------
// Shared wrapper — matches backend's unified response shape
// ---------------------------------------------------------------------------
export type ApiResponse<T> = {
  success: boolean
  code:    string
  message: string
  data:    T
}

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------
export type AuthUser = {
  id:       string
  username: string
  is_admin: boolean
  status?: 'online' | 'offline' | 'idle' | 'dnd'
  avatar_url?: string | null
}

export type LoginResponseData = {
  user:  AuthUser
  token: string
}

export type RegisterRequest = {
  username: string   // min 3 chars, trimmed
  password: string   // min 6 chars
}

export type LoginRequest = {
  username: string
  password: string
}

export const AUTH_ERROR_CODES = {
  INVALID_JSON:    'INVALID_JSON',
  USERNAME_EXISTS: 'USERNAME_EXISTS',
  BAD_CREDENTIALS: 'BAD_CREDENTIALS',
} as const
export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES]

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------
export type UpdateProfileRequest = {
  username?: string   // min 3 chars
  avatar_url?: string
}

export const USER_ERROR_CODES = {
  INVALID_JSON:    'INVALID_JSON',
  USERNAME_EXISTS: 'USERNAME_EXISTS',
} as const
export type UserErrorCode = typeof USER_ERROR_CODES[keyof typeof USER_ERROR_CODES]

// ---------------------------------------------------------------------------
// SERVERS
// ---------------------------------------------------------------------------
export type ServerDTO = {
  id:              string
  name:            string
  owner_id:        string
  is_public:       boolean
  default_role_id: string
  icon_url?:       string | null
  banner_url?:     string | null
}

export type CreateServerRequest = {
  name:      string
  is_public: boolean
}

export type ServerMemberDTO = {
  id:       string
  username: string
  is_admin: boolean
}

export type JoinRequestDTO = {
  id:        string
  server_id: string
  user_id:   string
  status:    'pending' | 'active' | 'rejected'
}

export const SERVER_ERROR_CODES = {
  JOIN_REQUEST_ALREADY_REVIEWED: 'JOIN_REQUEST_ALREADY_REVIEWED',
  ROLE_ASSIGN_FORBIDDEN:         'ROLE_ASSIGN_FORBIDDEN',
  INSUFFICIENT_PERMISSION:       'INSUFFICIENT_PERMISSION',
} as const
export type ServerErrorCode = typeof SERVER_ERROR_CODES[keyof typeof SERVER_ERROR_CODES]

// ---------------------------------------------------------------------------
// CHANNELS
// ---------------------------------------------------------------------------
export type ChannelDTO = {
  id:         string
  server_id:  string
  type:       'TEXT' | 'VOICE'
  name:       string
  position:   number
  is_private: boolean
  unread_count?: number
  parent_id?: string | null
}

export type CreateChannelRequest = {
  name:       string
  type:       'TEXT' | 'VOICE'
  parent_id?: string | null
  position?:  number
}

export const CHANNEL_ERROR_CODES = {
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
} as const
export type ChannelErrorCode = typeof CHANNEL_ERROR_CODES[keyof typeof CHANNEL_ERROR_CODES]

// ---------------------------------------------------------------------------
// MESSAGES
// ---------------------------------------------------------------------------
export type MessageContentDTO = {
  type:     string   // 'text/plain'
  payload:  string
  encoding: string   // 'utf-8'
}

export type MessageAttachmentDTO = {
  attachment_id: string
  url:           string
  file_name:     string
  file_type:     string
  file_size:     number
}

export type MessageDTO = {
  id:           string
  channel_id:   string
  author_id:    string
  content:      MessageContentDTO
  is_edited:    boolean
  is_pinned:    boolean
  created_at:   number   // unix seconds
  updated_at?:  number
  attachments:  MessageAttachmentDTO[]
  reactions:    unknown[]
}

export type MessageListDTO = {
  items:  MessageDTO[]
  limit:  number
  offset: number
}

export type CreateMessageRequest = {
  channel_id:     string
  content_type:   string   // 'text/plain'
  content:        string
  encoding:       string   // 'utf-8'
  is_pinned?:     boolean
  attachment_ids?: string[]
}

export type EditMessageRequest = {
  content_type: string
  content:      string
  encoding:     string
}

export const MESSAGE_ERROR_CODES = {
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
  MESSAGE_FORBIDDEN:       'MESSAGE_FORBIDDEN',
  MESSAGE_NOT_FOUND:       'MESSAGE_NOT_FOUND',
} as const
export type MessageErrorCode = typeof MESSAGE_ERROR_CODES[keyof typeof MESSAGE_ERROR_CODES]

// ---------------------------------------------------------------------------
// SOCIAL
// ---------------------------------------------------------------------------
export type FriendDTO = {
  id:       string
  username: string
  is_admin: boolean
}

export type FriendRequestDTO = {
  id:           string
  requester_id: string
  addressee_id: string
  status:       'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED'
}

export type SendFriendRequestBody = {
  user_id: string
}

export type RespondFriendRequestBody = {
  requester_id: string
  action:       'ACCEPT' | 'DECLINE'
}

export type BlockUserBody = {
  user_id: string
}

export const SOCIAL_ERROR_CODES = {
  CANNOT_FRIEND_SELF:      'CANNOT_FRIEND_SELF',
  RELATIONSHIP_BLOCKED:    'RELATIONSHIP_BLOCKED',
  FRIEND_REQUEST_EXISTS:   'FRIEND_REQUEST_EXISTS',
  INVALID_ACTION:          'INVALID_ACTION',
  FRIEND_REQUEST_NOT_FOUND:'FRIEND_REQUEST_NOT_FOUND',
  CANNOT_BLOCK_SELF:       'CANNOT_BLOCK_SELF',
  USER_NOT_FOUND:          'USER_NOT_FOUND',
  USER_ALREADY_BLOCKED:    'USER_ALREADY_BLOCKED',
} as const
export type SocialErrorCode = typeof SOCIAL_ERROR_CODES[keyof typeof SOCIAL_ERROR_CODES]

// ---------------------------------------------------------------------------
// ROLES
// ---------------------------------------------------------------------------
export type RoleDTO = {
  id:          string
  server_id:   string
  name:        string
  icon_url?:   string | null
  color:       string
  position:    number
  is_everyone: boolean
  permissions: string[]
}

export type CreateRoleRequest = {
  name:        string
  icon_url?:   string
  color:       string
  permissions: string[]
}

export type UpdateRoleRequest = {
  name?:       string
  icon_url?:   string
  color?:      string
  permissions?: string[]
}

// Permission enum values
export const ROLE_PERMISSIONS = {
  VIEW_CHANNEL: 'VIEW_CHANNEL',
  SEND_MESSAGES: 'SEND_MESSAGES',
  READ_MESSAGES: 'READ_MESSAGES',
  ADMINISTRATOR: 'ADMINISTRATOR',
  MANAGE_SERVER: 'MANAGE_SERVER',
  CREATE_INVITE: 'CREATE_INVITE',
  READ_MESSAGE_HISTORY: 'READ_MESSAGE_HISTORY',
  MANAGE_MESSAGES: 'MANAGE_MESSAGES',
  ATTACH_FILES: 'ATTACH_FILES',
  EMBED_LINKS: 'EMBED_LINKS',
  ADD_REACTIONS: 'ADD_REACTIONS',
  MANAGE_CHANNELS: 'MANAGE_CHANNELS',
  MANAGE_ROLES: 'MANAGE_ROLES',
  KICK_MEMBERS: 'KICK_MEMBERS',
  BAN_MEMBERS: 'BAN_MEMBERS',
  APPROVE_MEMBERS: 'APPROVE_MEMBERS',
} as const

export const ROLE_ERROR_CODES = {
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
} as const
export type RoleErrorCode = typeof ROLE_ERROR_CODES[keyof typeof ROLE_ERROR_CODES]

// ---------------------------------------------------------------------------
// INVITES
// ---------------------------------------------------------------------------
export type InviteDTO = {
  id:         string
  server_id:  string
  inviter_id: string
  code:       string
  max_uses:   number
  uses:       number
  expires_at: number | null
}

export type InviteInfoDTO = {
  invite: InviteDTO
  server: ServerDTO
}

export type CreateInviteRequest = {
  max_uses?:   number   // 0 = unlimited
  expires_at?: number   // unix seconds; omit = no expiration
}

export const INVITE_ERROR_CODES = {
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
  INVITE_NOT_FOUND:        'INVITE_NOT_FOUND',
  INVITE_EXPIRED:          'INVITE_EXPIRED',
} as const
export type InviteErrorCode = typeof INVITE_ERROR_CODES[keyof typeof INVITE_ERROR_CODES]

// ---------------------------------------------------------------------------
// UPLOADS
// ---------------------------------------------------------------------------
export type UploadResponseDTO = {
  attachment_id?: string
  media_type: string
  url:           string
  file_name:     string
  file_type:     string
  file_size:     number
}

export const UPLOAD_ERROR_CODES = {
  FILE_TYPE_NOT_ALLOWED: 'FILE_TYPE_NOT_ALLOWED',
} as const
export type UploadErrorCode = typeof UPLOAD_ERROR_CODES[keyof typeof UPLOAD_ERROR_CODES]

// ---------------------------------------------------------------------------
// TOURNAMENTS
// ---------------------------------------------------------------------------
export type TournamentFormatDTO =
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'swiss'

export type TournamentStatusDTO =
  | 'draft'
  | 'registration'
  | 'check_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type TournamentParticipantTypeDTO = 'solo' | 'team'

export type TournamentParticipantStatusDTO =
  | 'registered'
  | 'checked_in'
  | 'eliminated'
  | 'winner'
  | 'disqualified'

export type TournamentMatchStatusDTO =
  | 'pending'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'bye'

export type TournamentDTO = {
  id: string
  server_id: string
  name: string
  description?: string | null
  game: string
  format: TournamentFormatDTO
  status: TournamentStatusDTO
  max_participants: number
  participant_type: TournamentParticipantTypeDTO
  team_size?: number | null
  registration_deadline?: number | null
  check_in_duration_minutes: number
  prize_pool?: string | null
  rules?: string | null
  created_by: string
  started_at?: number | null
  completed_at?: number | null
  created_at: number
  updated_at: number
}

export type TournamentParticipantDTO = {
  id: string
  user?: {
    id: string
    username: string
    is_admin: boolean
    avatar_url?: string | null
  } | null
  team?: {
    id: string
    name: string
    captain_id: string
  } | null
  seed?: number | null
  status: TournamentParticipantStatusDTO
  final_rank?: number | null
  registered_at: number
  checked_in_at?: number | null
}

export type TournamentDetailDTO = {
  tournament: TournamentDTO
  participant_count: number
  participants: TournamentParticipantDTO[]
}

export type TournamentListDTO = {
  items: TournamentDTO[]
  total: number
  page: number
  limit: number
}

export type CreateTournamentRequest = {
  name: string
  description?: string | null
  game: string
  format: TournamentFormatDTO
  max_participants: number
  participant_type: TournamentParticipantTypeDTO
  team_size?: number | null
  registration_deadline?: number | null
  check_in_duration_minutes?: number | null
  prize_pool?: string | null
  rules?: string | null
}

export type UpdateTournamentRequest = {
  name?: string
  description?: string | null
  rules?: string | null
  prize_pool?: string | null
  max_participants?: number
  registration_deadline?: number | null
}

export type TournamentMatchDTO = {
  id: string
  tournament_id: string
  round: number
  match_number: number
  bracket_side: string
  participant1?: TournamentParticipantDTO | null
  participant2?: TournamentParticipantDTO | null
  score1?: number | null
  score2?: number | null
  winner?: TournamentParticipantDTO | null
  status: TournamentMatchStatusDTO
  next_match_id?: string | null
  loser_next_match_id?: string | null
  scheduled_at?: number | null
  completed_at?: number | null
  created_at: number
}

export type TournamentTeamDTO = {
  id: string
  name: string
  captain_id: string
  created_at: number
  members: Array<{
    id: string
    username: string
    is_admin: boolean
    avatar_url?: string | null
  }>
}

export type TournamentMatchReportDTO = {
  id: string
  match_id: string
  reported_by: string
  winner_id?: string | null
  score1: number
  score2: number
  screenshot_url?: string | null
  status: 'pending' | 'confirmed' | 'disputed'
  created_at: number
}
