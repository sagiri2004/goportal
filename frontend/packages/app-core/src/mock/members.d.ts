export type MockMemberStatus = 'online' | 'idle' | 'dnd' | 'offline';
export type MockMember = {
    id: string;
    name: string;
    initials: string;
    color: string;
    status: MockMemberStatus;
    role: string;
};
export type VoiceParticipant = {
    id: string;
    name: string;
    avatarUrl?: string;
    avatarColor: string;
    isSpeaking: boolean;
    isMuted: boolean;
    isDeafened: boolean;
    isScreenSharing: boolean;
    isCameraOn: boolean;
    streamUrl?: string;
};
export declare const mockMembers: MockMember[];
export declare const mockVoiceParticipants: VoiceParticipant[];
//# sourceMappingURL=members.d.ts.map