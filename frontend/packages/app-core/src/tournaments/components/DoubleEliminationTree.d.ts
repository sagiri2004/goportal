import React from 'react';
import type { TournamentMatchDTO, TournamentParticipantDTO } from '@goportal/types';
type Props = {
    matches: TournamentMatchDTO[];
    myParticipant: TournamentParticipantDTO | null;
    onOpenMatch: (match: TournamentMatchDTO) => void;
};
type SingleProps = {
    matches: TournamentMatchDTO[];
    myParticipant: TournamentParticipantDTO | null;
    onOpenMatch: (match: TournamentMatchDTO) => void;
};
export declare const DoubleEliminationTree: React.FC<Props>;
export declare const SingleEliminationTree: React.FC<SingleProps>;
export {};
//# sourceMappingURL=DoubleEliminationTree.d.ts.map