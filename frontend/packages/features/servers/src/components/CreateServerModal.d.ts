import React from 'react';
import type { CreateServerRequest } from '@goportal/types';
type CreateServerModalProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    defaultServerName: string;
    onCreate: (payload: CreateServerRequest, iconFile: File | null) => Promise<void>;
};
export declare const CreateServerModal: React.FC<CreateServerModalProps>;
export {};
//# sourceMappingURL=CreateServerModal.d.ts.map