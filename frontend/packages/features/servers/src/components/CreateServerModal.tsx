import React, { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  Button,
  Input,
  Label,
} from '@goportal/ui'
import type { CreateServerRequest } from '@goportal/types'
import { ArrowLeft, Camera, Loader2, Users, Globe } from 'lucide-react'

type CreateServerModalProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  defaultServerName: string
  onCreate: (payload: CreateServerRequest) => Promise<void>
}

export const CreateServerModal: React.FC<CreateServerModalProps> = ({
  isOpen,
  onOpenChange,
  defaultServerName,
  onCreate,
}) => {
  const [step, setStep] = useState<'type' | 'details'>('type')
  const [serverType, setServerType] = useState<'friends' | 'community' | null>(null)
  const [form, setForm] = useState<CreateServerRequest>({
    name: defaultServerName,
    is_public: true,
  })
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string>()
  const [submitError, setSubmitError] = useState<string>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setStep('type')
    setServerType(null)
    setForm({
      name: defaultServerName,
      is_public: true,
    })
    setIconPreviewUrl(null)
    setNameError(undefined)
    setSubmitError(undefined)
    setIsSubmitting(false)
  }, [defaultServerName, isOpen])

  useEffect(() => {
    return () => {
      if (iconPreviewUrl) {
        URL.revokeObjectURL(iconPreviewUrl)
      }
    }
  }, [iconPreviewUrl])

  const handleChooseType = (type: 'friends' | 'community') => {
    setServerType(type)
    setForm((previous) => ({
      ...previous,
      is_public: type === 'community',
    }))
    setStep('details')
  }

  const validateName = (value: string): string | undefined => {
    const trimmed = value.trim()
    if (!trimmed) {
      return 'Tên server là bắt buộc.'
    }
    if (trimmed.length < 2) {
      return 'Tên server phải có ít nhất 2 ký tự.'
    }
    if (trimmed.length > 100) {
      return 'Tên server tối đa 100 ký tự.'
    }
    return undefined
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (iconPreviewUrl) {
      URL.revokeObjectURL(iconPreviewUrl)
    }
    setIconPreviewUrl(URL.createObjectURL(file))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitError(undefined)

    const error = validateName(form.name)
    setNameError(error)
    if (error) {
      return
    }

    setIsSubmitting(true)
    try {
      await onCreate({
        name: form.name.trim(),
        is_public: form.is_public,
      })
      onOpenChange(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Không thể tạo server. Vui lòng thử lại.'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="relative min-h-[420px]">
          <section
            className={[
              'absolute inset-0 p-6 transition-opacity duration-200',
              step === 'type' ? 'opacity-100' : 'opacity-0 pointer-events-none',
            ].join(' ')}
            aria-hidden={step !== 'type'}
          >
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Tạo server của bạn</h2>
              <div className="h-px bg-border" />
              <p className="text-sm text-muted-foreground">Server của bạn dành cho ai?</p>

              <button
                type="button"
                onClick={() => handleChooseType('friends')}
                className="w-full text-left rounded-md border border-border px-4 py-3 hover:bg-accent transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Dành cho tôi và bạn bè</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleChooseType('community')}
                className="w-full text-left rounded-md border border-border px-4 py-3 hover:bg-accent transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Dành cho câu lạc bộ hoặc cộng đồng</p>
                  </div>
                </div>
              </button>

              <p className="text-sm text-muted-foreground">
                Đã có lời mời?{' '}
                <button
                  type="button"
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  Tham gia Server
                </button>
              </p>
            </div>
          </section>

          <section
            className={[
              'absolute inset-0 p-6 transition-opacity duration-200',
              step === 'details' ? 'opacity-100' : 'opacity-0 pointer-events-none',
            ].join(' ')}
            aria-hidden={step !== 'details'}
          >
            <form onSubmit={handleSubmit} className="h-full flex flex-col">
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  className="px-2"
                  onClick={() => setStep('type')}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Quay lại
                </Button>
              </div>

              <div className="mt-3 h-px bg-border" />

              <div className="mt-4 flex-1 space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Tuỳ chỉnh server của bạn</h2>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="w-24 h-24 rounded-full border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:bg-accent transition-colors"
                    disabled={isSubmitting}
                  >
                    {iconPreviewUrl ? (
                      <img
                        src={iconPreviewUrl}
                        alt="Server icon preview"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">Tải ảnh lên</span>
                      </>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="server-name" className="text-xs uppercase tracking-wide">
                    Tên Server
                  </Label>
                  <Input
                    id="server-name"
                    value={form.name}
                    onChange={(event) => {
                      const value = event.target.value
                      setForm((previous) => ({ ...previous, name: value }))
                      if (nameError) {
                        setNameError(validateName(value))
                      }
                    }}
                    autoFocus
                    disabled={isSubmitting}
                  />
                  {nameError && <p className="text-xs text-destructive">{nameError}</p>}
                </div>

                <p className="text-xs text-muted-foreground">
                  Bằng cách tạo server, bạn đồng ý với Điều khoản dịch vụ của chúng tôi.
                </p>

                {submitError && <p className="text-sm text-red-400">{submitError}</p>}

                <p className="text-xs text-muted-foreground">
                  Chế độ: {serverType === 'community' ? 'Cộng đồng (public)' : 'Bạn bè (private)'}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Huỷ
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isSubmitting ? 'Đang tạo...' : 'Tạo Server'}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
