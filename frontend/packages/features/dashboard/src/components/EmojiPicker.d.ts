import React from 'react';
type EmojiPickerProps = {
    trigger: React.ReactElement;
    onSelect: (emoji: string) => void;
    align?: 'start' | 'center' | 'end';
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};
export declare const EmojiPicker: React.FC<EmojiPickerProps>;
export {};
//# sourceMappingURL=EmojiPicker.d.ts.map