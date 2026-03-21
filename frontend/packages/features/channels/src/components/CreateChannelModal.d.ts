import React from 'react';
import type { CreateChannelRequest } from '@goportal/types';
type CreateChannelModalProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (payload: CreateChannelRequest) => Promise<void>;
};
export declare const CreateChannelModal: React.FC<CreateChannelModalProps>;
export {};
//# sourceMappingURL=CreateChannelModal.d.ts.map