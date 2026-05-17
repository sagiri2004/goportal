import React from 'react';
import type { TournamentDTO } from '@goportal/types';
type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    serverId: string;
    tournament?: TournamentDTO | null;
    onSuccess?: (tournament: TournamentDTO) => void;
};
export declare const TournamentCreateEditDialog: React.FC<Props>;
export {};
//# sourceMappingURL=TournamentCreateEditDialog.d.ts.map