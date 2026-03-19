import React, { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'

type EmojiPickerProps = {
  trigger: React.ReactElement
  onSelect: (emoji: string) => void
  align?: 'start' | 'center' | 'end'
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  trigger,
  onSelect,
  align = 'end',
  open: openProp,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = typeof openProp === 'boolean'
  const open = isControlled ? openProp : internalOpen

  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 border-0 p-0 shadow-2xl"
          side="top"
          align={align}
          sideOffset={8}
          avoidCollisions
          collisionPadding={16}
        >
          <Picker
            data={data}
            onEmojiSelect={(emoji: any) => {
              onSelect(emoji.native)
              setOpen(false)
            }}
            theme="dark"
            set="native"
            previewPosition="none"
            skinTonePosition="none"
            maxFrequentRows={1}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
