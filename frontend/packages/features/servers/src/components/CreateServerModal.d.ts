import React from 'react';
import type { CreateServerRequest } from '@goportal/types';
type InvitePreview = {
    code: string;
    server: {
        id: string;
        name: string;
        iconUrl?: string;
        memberCount: number;
    };
    expiresAt?: number | null;
};
type CreateServerModalProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    defaultServerName: string;
    onCreate: (payload: CreateServerRequest, iconFile: File | null) => Promise<void>;
    onResolveInvitePreview?: (code: string) => Promise<InvitePreview>;
    onJoinByInvite?: (code: string) => Promise<void>;
    initialInviteCode?: string | null;
};
export declare const CreateServerModal: React.FC<CreateServerModalProps>;
export {};
//# sourceMappingURL=CreateServerModal.d.ts.map