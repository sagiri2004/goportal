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

type InvitePreview = {
  code: string
  server: {
    id: string
    name: string
    iconUrl?: string
    memberCount: number
  }
  expiresAt?: number | null
}

type CreateServerModalProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  defaultServerName: string
  onCreate: (payload: CreateServerRequest, iconFile: File | null) => Promise<void>
  onResolveInvitePreview?: (code: string) => Promise<InvitePreview>
  onJoinByInvite?: (code: string) => Promise<void>
  initialInviteCode?: string | null
}

const parseInviteCode = (input: string): string => {
  const trimmed = input.trim()
  if (!trimmed) {
    return ''
  }

  try {
    const url = new URL(trimmed)
    const segments = url.pathname.split('/').filter(Boolean)
    const inviteIndex = segments.findIndex((segment) => segment.toLowerCase() === 'invite')
    if (inviteIndex >= 0 && segments[inviteIndex + 1]) {
      return segments[inviteIndex + 1]
    }
    return segments[segments.length - 1] ?? ''
  } catch {
    return trimmed.replace(/^.*\/invite\//i, '').split('?')[0].split('#')[0]
  }
}

export const CreateServerModal: React.FC<CreateServerModalProps> = ({
  isOpen,
  onOpenChange,
  defaultServerName,
  onCreate,
  onResolveInvitePreview,
  onJoinByInvite,
  initialInviteCode,
}) => {
  const [step, setStep] = useState<'type' | 'details' | 'join-input' | 'join-preview'>('type')
  const [serverType, setServerType] = useState<'friends' | 'community' | null>(null)
  const [form, setForm] = useState<CreateServerRequest>({
    name: defaultServerName,
    is_public: true,
  })
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null)
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [nameError, setNameError] = useState<string>()
  const [submitError, setSubmitError] = useState<string>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inviteInput, setInviteInput] = useState('')
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [isResolvingInvite, setIsResolvingInvite] = useState(false)
  const [isJoiningInvite, setIsJoiningInvite] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const autoResolvedInviteCodeRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      autoResolvedInviteCodeRef.current = null
      return
    }
    const prefilledInviteCode = initialInviteCode ? parseInviteCode(initialInviteCode) : ''
    setStep(prefilledInviteCode ? 'join-input' : 'type')
    setServerType(null)
    setForm({
      name: defaultServerName,
      is_public: true,
    })
    setIconPreviewUrl(null)
    setIconFile(null)
    setNameError(undefined)
    setSubmitError(undefined)
    setIsSubmitting(false)
    setInviteInput(prefilledInviteCode)
    setInvitePreview(null)
    setInviteError(null)
    setIsResolvingInvite(false)
    setIsJoiningInvite(false)
    autoResolvedInviteCodeRef.current = null
  }, [defaultServerName, initialInviteCode, isOpen])

  useEffect(() => {
    if (!isOpen || !onResolveInvitePreview || step !== 'join-input') {
      return
    }

    const prefilledInviteCode = initialInviteCode ? parseInviteCode(initialInviteCode) : ''
    if (!prefilledInviteCode || autoResolvedInviteCodeRef.current === prefilledInviteCode) {
      return
    }

    autoResolvedInviteCodeRef.current = prefilledInviteCode
    let cancelled = false
    setInviteError(null)
    setIsResolvingInvite(true)

    void onResolveInvitePreview(prefilledInviteCode)
      .then((preview) => {
        if (cancelled) {
          return
        }
        setInvitePreview(preview)
        setStep('join-preview')
      })
      .catch((error) => {
        if (cancelled) {
          return
        }
        setInviteError(error instanceof Error ? error.message : 'Mã mời không hợp lệ hoặc đã hết hạn')
      })
      .finally(() => {
        if (!cancelled) {
          setIsResolvingInvite(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [initialInviteCode, isOpen, onResolveInvitePreview, step])

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
    setIconFile(file)
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
      }, iconFile)
      onOpenChange(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Không thể tạo server. Vui lòng thử lại.'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resolveInvite = async () => {
    if (!onResolveInvitePreview) {
      setInviteError('Tính năng tham gia server chưa sẵn sàng.')
      return
    }

    const code = parseInviteCode(inviteInput)
    if (!code) {
      setInviteError('Vui lòng nhập mã mời hoặc link hợp lệ.')
      return
    }

    setInviteError(null)
    setIsResolvingInvite(true)
    try {
      const preview = await onResolveInvitePreview(code)
      autoResolvedInviteCodeRef.current = code
      setInvitePreview(preview)
      setStep('join-preview')
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Mã mời không hợp lệ hoặc đã hết hạn')
    } finally {
      setIsResolvingInvite(false)
    }
  }

  const joinByInvite = async () => {
    if (!onJoinByInvite || !invitePreview) {
      setInviteError('Không thể tham gia server lúc này.')
      return
    }

    setInviteError(null)
    setIsJoiningInvite(true)
    try {
      await onJoinByInvite(invitePreview.code)
      onOpenChange(false)
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Không thể tham gia server.')
    } finally {
      setIsJoiningInvite(false)
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
                  onClick={() => setStep('join-input')}
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
              step === 'join-input' ? 'opacity-100' : 'opacity-0 pointer-events-none',
            ].join(' ')}
            aria-hidden={step !== 'join-input'}
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between">
                <Button type="button" variant="ghost" className="px-2" onClick={() => setStep('type')}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Quay lại
                </Button>
              </div>

              <div className="mt-3 h-px bg-border" />

              <div className="mt-4 flex-1 space-y-3">
                <h2 className="text-xl font-semibold text-foreground">Tham gia Server</h2>
                <p className="text-sm text-muted-foreground">Nhập mã mời hoặc link lời mời.</p>
                <Input
                  value={inviteInput}
                  onChange={(event) => {
                    setInviteInput(event.target.value)
                    setInviteError(null)
                  }}
                  placeholder="https://goportal.app/invite/abc123 hoặc abc123"
                />
                {inviteError && <p className="text-sm text-red-400">{inviteError}</p>}
              </div>

              <div className="mt-6 flex items-center justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Huỷ
                </Button>
                <Button type="button" onClick={() => void resolveInvite()} disabled={isResolvingInvite}>
                  {isResolvingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isResolvingInvite ? 'Đang kiểm tra...' : 'Tiếp tục'}
                </Button>
              </div>
            </div>
          </section>

          <section
            className={[
              'absolute inset-0 p-6 transition-opacity duration-200',
              step === 'join-preview' ? 'opacity-100' : 'opacity-0 pointer-events-none',
            ].join(' ')}
            aria-hidden={step !== 'join-preview'}
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between">
                <Button type="button" variant="ghost" className="px-2" onClick={() => setStep('join-input')}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Quay lại
                </Button>
              </div>

              <div className="mt-3 h-px bg-border" />

              <div className="mt-4 flex-1 space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Xác nhận tham gia</h2>

                <div className="rounded-md border border-border bg-[hsl(240,6%,11%)] p-4">
                  <div className="flex items-center gap-3">
                    {invitePreview?.server.iconUrl ? (
                      <img src={invitePreview.server.iconUrl} alt={invitePreview.server.name} className="h-12 w-12 rounded-md object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-accent" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{invitePreview?.server.name}</p>
                      <p className="text-xs text-muted-foreground">{invitePreview?.server.memberCount ?? 0} thành viên</p>
                    </div>
                  </div>
                </div>

                {inviteError && <p className="text-sm text-red-400">{inviteError}</p>}
              </div>

              <div className="mt-6 flex items-center justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Huỷ
                </Button>
                <Button type="button" className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => void joinByInvite()} disabled={isJoiningInvite}>
                  {isJoiningInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isJoiningInvite ? 'Đang tham gia...' : 'Tham gia Server'}
                </Button>
              </div>
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
