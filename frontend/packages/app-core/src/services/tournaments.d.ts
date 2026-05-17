import type { CreateTournamentRequest, TournamentDetailDTO, TournamentListDTO, TournamentMatchDTO, TournamentMatchReportDTO, TournamentStatusDTO, TournamentTeamDTO, TournamentParticipantDTO, TournamentRoleBindingDTO, TournamentRoleDTO, TournamentDTO, TournamentMatchWorkspaceDTO, TournamentObserverTokenBundleDTO, UpdateTournamentRequest } from '@goportal/types';
type ListTournamentsParams = {
    status?: TournamentStatusDTO;
    page?: number;
    limit?: number;
};
export declare const listTournamentsByServer: (serverId: string, params?: ListTournamentsParams) => Promise<TournamentListDTO>;
export declare const createTournament: (serverId: string, input: CreateTournamentRequest) => Promise<TournamentDTO>;
export declare const getTournamentDetail: (tournamentId: string) => Promise<TournamentDetailDTO>;
export declare const updateTournament: (tournamentId: string, input: UpdateTournamentRequest) => Promise<TournamentDTO>;
export declare const deleteTournament: (tournamentId: string) => Promise<void>;
export declare const updateTournamentStatus: (tournamentId: string, status: TournamentStatusDTO) => Promise<TournamentDTO>;
export declare const registerTournamentParticipant: (tournamentId: string) => Promise<TournamentParticipantDTO>;
export declare const cancelTournamentRegistration: (tournamentId: string) => Promise<void>;
export declare const checkInTournamentParticipant: (tournamentId: string, participantId: string) => Promise<TournamentParticipantDTO>;
export declare const removeTournamentParticipant: (tournamentId: string, participantId: string) => Promise<void>;
export declare const updateTournamentParticipantSeed: (tournamentId: string, participantId: string, seed: number) => Promise<TournamentParticipantDTO>;
export declare const bulkAddTournamentParticipants: (tournamentId: string, userIds: string[]) => Promise<TournamentParticipantDTO[]>;
export declare const getTournamentBracket: (tournamentId: string) => Promise<TournamentMatchDTO[]>;
export declare const listTournamentMatches: (tournamentId: string, params?: {
    status?: TournamentMatchDTO["status"];
    round?: number;
    bracket_side?: string;
}) => Promise<TournamentMatchDTO[]>;
export declare const getTournamentMatch: (tournamentId: string, matchId: string) => Promise<TournamentMatchDTO>;
export declare const reportTournamentMatchResult: (tournamentId: string, matchId: string, input: {
    winner_id: string;
    score1: number;
    score2: number;
    screenshot_url?: string | null;
}) => Promise<TournamentMatchReportDTO>;
export declare const disputeTournamentMatchResult: (tournamentId: string, matchId: string) => Promise<TournamentMatchReportDTO>;
export declare const overrideTournamentMatchResult: (tournamentId: string, matchId: string, input: {
    winner_id: string;
    score1: number;
    score2: number;
    reason: string;
}) => Promise<TournamentMatchDTO>;
export declare const getTournamentStandings: (tournamentId: string) => Promise<TournamentParticipantDTO[]>;
export declare const listTournamentTeams: (tournamentId: string) => Promise<TournamentTeamDTO[]>;
export declare const createTournamentTeam: (tournamentId: string, input: {
    name: string;
}) => Promise<TournamentTeamDTO>;
export declare const addTournamentTeamMember: (tournamentId: string, teamId: string, input: {
    user_id: string;
}) => Promise<void>;
export declare const removeTournamentTeamMember: (tournamentId: string, teamId: string, userId: string) => Promise<void>;
export declare const deleteTournamentTeam: (tournamentId: string, teamId: string) => Promise<void>;
export declare const updateTournamentMatchStatus: (tournamentId: string, matchId: string, status: TournamentMatchDTO["status"]) => Promise<TournamentMatchDTO>;
export declare const startTournamentMatch: (tournamentId: string, matchId: string) => Promise<{
    match: TournamentMatchDTO;
    workspace: TournamentMatchWorkspaceDTO;
    screen_share_required: boolean;
}>;
export declare const getUserTournamentHistory: (userId: string) => Promise<TournamentDTO[]>;
export declare const ensureTournamentRoles: (tournamentId: string) => Promise<TournamentRoleDTO[]>;
export declare const listTournamentRoleBindings: (tournamentId: string) => Promise<TournamentRoleBindingDTO[]>;
export declare const bindTournamentRole: (tournamentId: string, input: {
    role_code: string;
    user_id: string;
}) => Promise<void>;
export declare const unbindTournamentRole: (tournamentId: string, roleCode: string, userId: string) => Promise<void>;
export declare const provisionTournamentMatchWorkspace: (tournamentId: string, matchId: string) => Promise<TournamentMatchWorkspaceDTO>;
export declare const listTournamentMatchWorkspaces: (tournamentId: string) => Promise<TournamentMatchWorkspaceDTO[]>;
export declare const getTournamentMatchObserverTokens: (tournamentId: string, matchId: string) => Promise<TournamentObserverTokenBundleDTO>;
export {};
//# sourceMappingURL=tournaments.d.ts.map