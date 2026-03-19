import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
export const EmojiPicker = ({ trigger, onSelect, align = 'end', open: openProp, onOpenChange, }) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = typeof openProp === 'boolean';
    const open = isControlled ? openProp : internalOpen;
    const setOpen = (nextOpen) => {
        if (!isControlled) {
            setInternalOpen(nextOpen);
        }
        onOpenChange?.(nextOpen);
    };
    return (_jsxs(Popover.Root, { open: open, onOpenChange: setOpen, children: [_jsx(Popover.Trigger, { asChild: true, children: trigger }), _jsx(Popover.Portal, { children: _jsx(Popover.Content, { className: "z-50 border-0 p-0 shadow-2xl", side: "top", align: align, sideOffset: 8, avoidCollisions: true, collisionPadding: 16, children: _jsx(Picker, { data: data, onEmojiSelect: (emoji) => {
                            onSelect(emoji.native);
                            setOpen(false);
                        }, theme: "dark", set: "native", previewPosition: "none", skinTonePosition: "none", maxFrequentRows: 1 }) }) })] }));
};
//# sourceMappingURL=EmojiPicker.js.map