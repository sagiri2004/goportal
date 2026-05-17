import type { TournamentFormatDTO, TournamentParticipantStatusDTO, TournamentStatusDTO } from '@goportal/types';
export declare const TOURNAMENT_STATUS_META: Record<TournamentStatusDTO, {
    label: string;
    className: string;
}>;
export declare const TOURNAMENT_FORMAT_META: Record<TournamentFormatDTO, {
    label: string;
    shortDescription: string;
}>;
export declare const PARTICIPANT_STATUS_META: Record<TournamentParticipantStatusDTO, {
    label: string;
    className: string;
}>;
export declare const toDateTimeLocalValue: (unixSeconds?: number | null) => string;
export declare const fromDateTimeLocalValue: (value: string) => number | null;
export declare const formatDateTime: (unixSeconds?: number | null) => string;
export declare const formatRelativeCountdown: (unixSeconds?: number | null) => string;
export declare const getParticipantDisplayName: (participant: {
    user?: {
        username: string;
    } | null;
    team?: {
        name: string;
    } | null;
}) => string;
//# sourceMappingURL=utils.d.ts.map