import React from 'react';
export type SharePickerAction = 'shareGame' | 'shareScore' | 'shareAchievement' | 'shareSessionStart';
type Props = {
    open: boolean;
    action: SharePickerAction | null;
    loading?: boolean;
    preferredChannelId?: string | null;
    onCancel: () => void;
    onConfirm: (selection: {
        serverId: string;
        channelId: string;
    }) => void;
};
export declare const GameSharePickerDialog: React.FC<Props>;
export {};
//# sourceMappingURL=GameSharePickerDialog.d.ts.map