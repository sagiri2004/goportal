import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, Separator } from '@goportal/ui'
import { ArrowLeft, Check, Copy, Loader2, MoreHorizontal, Pencil, Plus, Search, Upload, X } from 'lucide-react'
import type { MockServer } from '../mock/servers'
import type { RoleDTO } from '@goportal/types'
import {
  createServerInvite,
  deleteServerRole,
  createServerRole,
  getServerMembersWithRoles,
  getServerRoles,
  kickServerMember,
  updateServerRole,
  updateServerMemberRoles,
  updateServerProfile,
  uploadServerMedia,
  type ServerMemberWithRoles,
} from '../services'

type SettingsTab =
  | 'profile'
  | 'identity'
  | 'interactions'
  | 'members'
  | 'roles'
  | 'invites'
  | 'audit'

type Props = {
  open: boolean
  initialTab?: SettingsTab
  serverId: string
  server: MockServer
  onClose: () => void
  onServerUpdated: (serverId: string) => Promise<void>
  onToast: (message: string) => void
}

const initialsFromName = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)

const roleSwatches = ['#99AAB5', '#57F287', '#FEE75C', '#ED4245', '#5865F2', '#EB459E', '#1ABC9C']

const permissionGroups = [
  {
    key: 'general',
    title: 'Quyền Tổng Quát Máy Chủ',
    items: [
      { value: 'VIEW_CHANNEL', name: 'Xem kênh', description: 'Cho phép xem các kênh trong máy chủ.' },
      { value: 'READ_MESSAGES', name: 'Đọc tin nhắn', description: 'Cho phép đọc nội dung trong kênh chat.' },
      { value: 'READ_MESSAGE_HISTORY', name: 'Đọc lịch sử tin nhắn', description: 'Cho phép xem tin nhắn cũ.' },
      { value: 'MANAGE_SERVER', name: 'Quản lý máy chủ', description: 'Cho phép chỉnh sửa cài đặt máy chủ.' },
      { value: 'MANAGE_ROLES', name: 'Quản lý vai trò', description: 'Cho phép tạo/sửa/xóa vai trò.' },
      { value: 'CREATE_INVITE', name: 'Tạo lời mời', description: 'Cho phép tạo liên kết mời.' },
      { value: 'APPROVE_MEMBERS', name: 'Duyệt thành viên', description: 'Cho phép duyệt yêu cầu tham gia.' },
      { value: 'KICK_MEMBERS', name: 'Kick thành viên', description: 'Cho phép loại thành viên khỏi máy chủ.' },
      { value: 'BAN_MEMBERS', name: 'Cấm thành viên', description: 'Cho phép cấm thành viên.' },
      { value: 'ADMINISTRATOR', name: 'Quản trị viên', description: 'Bỏ qua mọi kiểm tra quyền.' },
    ],
  },
  {
    key: 'chat',
    title: 'Quyền Kênh Chat',
    items: [
      { value: 'SEND_MESSAGES', name: 'Gửi tin nhắn', description: 'Cho phép gửi tin nhắn văn bản.' },
      { value: 'MANAGE_MESSAGES', name: 'Quản lý tin nhắn', description: 'Cho phép xóa/ghim tin nhắn.' },
      { value: 'ADD_REACTIONS', name: 'Thêm biểu cảm', description: 'Cho phép thêm reaction vào tin nhắn.' },
      { value: 'ATTACH_FILES', name: 'Đính kèm tệp', description: 'Cho phép gửi tệp đính kèm.' },
      { value: 'EMBED_LINKS', name: 'Nhúng liên kết', description: 'Cho phép hiển thị preview liên kết.' },
    ],
  },
  {
    key: 'voice',
    title: 'Quyền Kênh Thoại',
    items: [
      { value: 'MANAGE_CHANNELS', name: 'Quản lý kênh', description: 'Cho phép tạo và sắp xếp kênh.' },
    ],
  },
] as const

export const ServerSettingsOverlay: React.FC<Props> = ({
  open,
  initialTab = 'profile',
  serverId,
  server,
  onClose,
  onServerUpdated,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)
  const [name, setName] = useState(server.name)
  const [iconUrl, setIconUrl] = useState<string | null>(server.iconUrl ?? null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(server.bannerUrl ?? null)
  const [initialState, setInitialState] = useState({
    name: server.name,
    iconUrl: server.iconUrl ?? null,
    bannerUrl: server.bannerUrl ?? null,
  })
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isUploadingIcon, setIsUploadingIcon] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [members, setMembers] = useState<ServerMemberWithRoles[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [roles, setRoles] = useState<RoleDTO[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleColor, setNewRoleColor] = useState('#99AAB5')
  const [roleSearch, setRoleSearch] = useState('')
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editorTab, setEditorTab] = useState<'display' | 'permissions' | 'links' | 'members'>('display')
  const [rolePermissionSearch, setRolePermissionSearch] = useState('')
  const [roleDraft, setRoleDraft] = useState<{ name: string; color: string; permissions: string[] } | null>(null)
  const [isSavingRole, setIsSavingRole] = useState(false)
  const [roleSaveError, setRoleSaveError] = useState<string | null>(null)
  const [roleFormError, setRoleFormError] = useState<string | null>(null)
  const [isCreatingRole, setIsCreatingRole] = useState(false)
  const iconInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const isDirty =
    name.trim() !== initialState.name ||
    (iconUrl ?? null) !== (initialState.iconUrl ?? null) ||
    (bannerUrl ?? null) !== (initialState.bannerUrl ?? null)

  const totalMembers = members.length
  const onlineMembers = members.filter((item) =>
    item.user.status === 'online' || item.user.status === 'idle' || item.user.status === 'dnd',
  ).length

  const roleMemberCount = useMemo(() => {
    const counts = new Map<string, number>()
    for (const member of members) {
      for (const role of member.roles) {
        counts.set(role.id, (counts.get(role.id) ?? 0) + 1)
      }
    }
    return counts
  }, [members])

  const filteredMembers = useMemo(() => {
    const keyword = memberSearch.trim().toLowerCase()
    if (!keyword) {
      return members
    }
    return members.filter((member) => member.user.username.toLowerCase().includes(keyword))
  }, [memberSearch, members])

  const sortedRoles = useMemo(() => {
    const everyone = roles.find((role) => role.is_everyone)
    const rest = roles
      .filter((role) => !role.is_everyone)
      .sort((a, b) => b.position - a.position || a.name.localeCompare(b.name))
    return everyone ? [...rest, everyone] : rest
  }, [roles])

  const filteredRoles = useMemo(() => {
    const keyword = roleSearch.trim().toLowerCase()
    if (!keyword) {
      return sortedRoles
    }
    const everyone = sortedRoles.find((role) => role.is_everyone)
    const rest = sortedRoles.filter((role) => !role.is_everyone && role.name.toLowerCase().includes(keyword))
    if (everyone && everyone.name.toLowerCase().includes(keyword)) {
      return [...rest, everyone]
    }
    return everyone ? [...rest, everyone] : rest
  }, [roleSearch, sortedRoles])

  const activeRole = useMemo(
    () => (editingRoleId ? roles.find((role) => role.id === editingRoleId) ?? null : null),
    [editingRoleId, roles]
  )

  const roleDirty = useMemo(() => {
    if (!activeRole || !roleDraft) {
      return false
    }
    const permsA = [...activeRole.permissions].sort().join('|')
    const permsB = [...roleDraft.permissions].sort().join('|')
    return activeRole.name !== roleDraft.name || activeRole.color.toLowerCase() !== roleDraft.color.toLowerCase() || permsA !== permsB
  }, [activeRole, roleDraft])

  useEffect(() => {
    if (!open) {
      return
    }
    setActiveTab(initialTab)
    setName(server.name)
    setIconUrl(server.iconUrl ?? null)
    setBannerUrl(server.bannerUrl ?? null)
    setInitialState({
      name: server.name,
      iconUrl: server.iconUrl ?? null,
      bannerUrl: server.bannerUrl ?? null,
    })
    setProfileError(null)
    setInviteCode(null)
    setInviteError(null)
  }, [initialTab, open, server.bannerUrl, server.iconUrl, server.name])

  useEffect(() => {
    if (!open) {
      return
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      if (isDirty) {
        setShowCloseConfirm(true)
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [isDirty, onClose, open])

  useEffect(() => {
    if (!open || (activeTab !== 'members' && activeTab !== 'roles')) {
      return
    }

    let cancelled = false
    const loadMembers = async () => {
      setLoadingMembers(true)
      setMembersError(null)
      try {
        const data = await getServerMembersWithRoles(serverId)
        if (!cancelled) {
          setMembers(data)
        }
      } catch (error) {
        if (!cancelled) {
          setMembersError(error instanceof Error ? error.message : 'Không thể tải thành viên.')
        }
      } finally {
        if (!cancelled) {
          setLoadingMembers(false)
        }
      }
    }

    void loadMembers()
    return () => {
      cancelled = true
    }
  }, [activeTab, open, serverId])

  useEffect(() => {
    if (!open || activeTab !== 'roles') {
      return
    }
    let cancelled = false
    const loadRoles = async () => {
      setLoadingRoles(true)
      setRolesError(null)
      try {
        const data = await getServerRoles(serverId)
        if (!cancelled) {
          setRoles(data)
        }
      } catch (error) {
        if (!cancelled) {
          setRolesError(error instanceof Error ? error.message : 'Không thể tải vai trò.')
        }
      } finally {
        if (!cancelled) {
          setLoadingRoles(false)
        }
      }
    }
    void loadRoles()
    return () => {
      cancelled = true
    }
  }, [activeTab, open, serverId])

  useEffect(() => {
    if (!activeRole) {
      setRoleDraft(null)
      return
    }
    setRoleDraft({
      name: activeRole.name,
      color: activeRole.color,
      permissions: [...activeRole.permissions],
    })
    setRoleSaveError(null)
    setRolePermissionSearch('')
    setEditorTab('display')
  }, [activeRole])

  if (!open) {
    return null
  }

  const handleUpload = async (file: File, type: 'icon' | 'banner') => {
    if (type === 'icon') {
      setIsUploadingIcon(true)
    } else {
      setIsUploadingBanner(true)
    }
    try {
      const url = await uploadServerMedia(file)
      if (type === 'icon') {
        setIconUrl(url)
      } else {
        setBannerUrl(url)
      }
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Không thể tải ảnh lên.')
    } finally {
      if (type === 'icon') {
        setIsUploadingIcon(false)
      } else {
        setIsUploadingBanner(false)
      }
    }
  }

  const handleSaveProfile = async () => {
    const trimmed = name.trim()
    if (trimmed.length < 2 || trimmed.length > 100) {
      setProfileError('Tên máy chủ phải có từ 2 đến 100 ký tự.')
      return
    }
    setIsSavingProfile(true)
    setProfileError(null)
    try {
      const body: { name?: string; icon_url?: string; banner_url?: string } = {}
      if (trimmed !== initialState.name) body.name = trimmed
      if ((iconUrl ?? null) !== (initialState.iconUrl ?? null)) body.icon_url = iconUrl ?? ''
      if ((bannerUrl ?? null) !== (initialState.bannerUrl ?? null)) body.banner_url = bannerUrl ?? ''
      if (Object.keys(body).length > 0) {
        await updateServerProfile(serverId, body)
        await onServerUpdated(serverId)
        setInitialState({
          name: trimmed,
          iconUrl: iconUrl ?? null,
          bannerUrl: bannerUrl ?? null,
        })
        onToast('Đã lưu thay đổi máy chủ.')
      }
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Không thể lưu thay đổi.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleKick = async (userId: string) => {
    try {
      await kickServerMember(serverId, userId)
      setMembers((prev) => prev.filter((member) => member.user.id !== userId))
      onToast('Đã kick thành viên.')
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : 'Không thể kick thành viên.')
    }
  }

  const handleAssignRole = async (userId: string, roleId: string) => {
    const target = members.find((member) => member.user.id === userId)
    if (!target) {
      return
    }
    const currentRoleIds = target.roles.map((role) => role.id)
    const next = currentRoleIds.includes(roleId)
      ? currentRoleIds.filter((id) => id !== roleId)
      : [...currentRoleIds, roleId]
    try {
      await updateServerMemberRoles(serverId, userId, next)
      setMembers((prev) =>
        prev.map((member) =>
          member.user.id === userId
            ? { ...member, roles: roles.filter((role) => next.includes(role.id)) }
            : member
        )
      )
      onToast('Đã cập nhật vai trò thành viên.')
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : 'Không thể cập nhật vai trò.')
    }
  }

  const handleCreateRole = async () => {
    const trimmed = newRoleName.trim()
    if (!trimmed) {
      setRoleFormError('Tên vai trò là bắt buộc.')
      return
    }
    setRoleFormError(null)
    setIsCreatingRole(true)
    try {
      const created = await createServerRole(serverId, { name: trimmed, color: newRoleColor, permissions: [] })
      setRoles((prev) => [...prev, created])
      setNewRoleName('')
      setEditingRoleId(created.id)
    } catch (error) {
      setRoleFormError(error instanceof Error ? error.message : 'Không thể tạo vai trò.')
    } finally {
      setIsCreatingRole(false)
    }
  }

  const toggleDraftPermission = (permission: string) => {
    setRoleDraft((prev) => {
      if (!prev) return prev
      const exists = prev.permissions.includes(permission)
      return {
        ...prev,
        permissions: exists ? prev.permissions.filter((item) => item !== permission) : [...prev.permissions, permission],
      }
    })
  }

  const clearPermissionGroup = (groupKey: string) => {
    const group = permissionGroups.find((item) => item.key === groupKey)
    if (!group) return
    const values = new Set<string>(group.items.map((item) => item.value))
    setRoleDraft((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        permissions: prev.permissions.filter((item) => !values.has(item)),
      }
    })
  }

  const resetRoleDraft = () => {
    if (!activeRole) return
    setRoleDraft({
      name: activeRole.name,
      color: activeRole.color,
      permissions: [...activeRole.permissions],
    })
    setRoleSaveError(null)
  }

  const saveRoleDraft = async () => {
    if (!activeRole || !roleDraft) return
    const body: { name?: string; color?: string; permissions?: string[] } = {}
    if (roleDraft.name.trim() !== activeRole.name) body.name = roleDraft.name.trim()
    if (roleDraft.color.toLowerCase() !== activeRole.color.toLowerCase()) body.color = roleDraft.color
    const currentPerms = [...activeRole.permissions].sort().join('|')
    const nextPerms = [...roleDraft.permissions].sort().join('|')
    if (currentPerms !== nextPerms) body.permissions = [...roleDraft.permissions]
    if (Object.keys(body).length === 0) return

    setIsSavingRole(true)
    setRoleSaveError(null)
    try {
      const updated = await updateServerRole(serverId, activeRole.id, body)
      setRoles((prev) => prev.map((role) => (role.id === updated.id ? updated : role)))
      onToast('Đã lưu thay đổi vai trò.')
    } catch (error) {
      setRoleSaveError(error instanceof Error ? error.message : 'Không thể lưu vai trò.')
    } finally {
      setIsSavingRole(false)
    }
  }

  const handleDeleteRole = async (role: RoleDTO) => {
    if (role.is_everyone) {
      return
    }
    try {
      await deleteServerRole(serverId, role.id)
      setRoles((prev) => prev.filter((item) => item.id !== role.id))
      if (editingRoleId === role.id) {
        setEditingRoleId(null)
      }
      onToast('Đã xóa vai trò.')
    } catch (error) {
      setRoleFormError(error instanceof Error ? error.message : 'Không thể xóa vai trò.')
    }
  }

  const inviteLink = inviteCode ? `${window.location.origin}/invite/${inviteCode}` : `${window.location.origin}/invite/${serverId}`

  return (
    <div className="fixed inset-0 z-50 flex bg-[hsl(240,8%,12%)]">
      <aside className="w-[220px] border-r border-border px-3 py-6">
        <p className="px-2 text-xs uppercase tracking-wide text-muted-foreground">MÁY CHỦ CỦA {server.name}</p>
        <div className="mt-2 space-y-0.5">
          {[
            ['profile', 'Hồ Sơ Máy Chủ'],
            ['identity', 'Số Nhận Diện Máy Chủ'],
            ['interactions', 'Tương Tác'],
          ].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setActiveTab(key as SettingsTab)} className={`w-full px-2 py-1.5 rounded-md text-sm text-left cursor-pointer hover:bg-accent hover:text-foreground ${activeTab === key ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground'}`}>{label}</button>
          ))}
        </div>

        <p className="mt-5 px-2 text-xs uppercase tracking-wide text-muted-foreground">MỌI NGƯỜI</p>
        <div className="mt-2 space-y-0.5">
          {[
            ['members', 'Thành viên'],
            ['roles', 'Vai trò'],
            ['invites', 'Lời mời'],
          ].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setActiveTab(key as SettingsTab)} className={`w-full px-2 py-1.5 rounded-md text-sm text-left cursor-pointer hover:bg-accent hover:text-foreground ${activeTab === key ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground'}`}>{label}</button>
          ))}
        </div>

        <p className="mt-5 px-2 text-xs uppercase tracking-wide text-muted-foreground">ĐIỀU CHỈNH</p>
        <button type="button" onClick={() => setActiveTab('audit')} className={`mt-2 w-full px-2 py-1.5 rounded-md text-sm text-left cursor-pointer hover:bg-accent hover:text-foreground ${activeTab === 'audit' ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground'}`}>Nhật Ký Chỉnh Sửa</button>

        <Separator className="my-4" />
        <button type="button" className="w-full px-2 py-1.5 rounded-md text-sm text-left text-red-400 hover:bg-red-500/10">Xoá máy chủ</button>
      </aside>

      <main className="relative flex-1 p-8 overflow-y-auto">
        <button type="button" onClick={() => (isDirty ? setShowCloseConfirm(true) : onClose())} className="absolute right-6 top-6 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        {activeTab === 'profile' && (
          <div className="flex gap-8">
            <div className="flex-1 max-w-2xl">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">TÊN</p>
              <Input value={name} onChange={(event) => setName(event.target.value)} className="mt-2" />

              <div className="mt-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">ẢNH MÁY CHỦ</p>
                <div className="mt-2 rounded-lg border border-border bg-[hsl(240,6%,10%)] overflow-hidden">
                  <div className="relative h-[140px] bg-indigo-600">
                    {bannerUrl && <img src={bannerUrl} className="w-full h-full object-cover" />}
                    <div className="absolute left-4 -bottom-10 w-20 h-20 rounded-full border-4 border-[hsl(240,6%,10%)] overflow-hidden bg-accent flex items-center justify-center">
                      {iconUrl ? <img src={iconUrl} className="w-full h-full object-cover" /> : <span className="font-semibold">{initialsFromName(name || server.name)}</span>}
                    </div>
                  </div>
                  <div className="pt-12 px-4 pb-4 space-y-3">
                    <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleUpload(file, 'icon') }} />
                    <Button type="button" variant="outline" onClick={() => iconInputRef.current?.click()} disabled={isUploadingIcon}>
                      {isUploadingIcon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Thay Đổi Biểu Tượng Máy Chủ
                    </Button>
                    <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleUpload(file, 'banner') }} />
                    <Button type="button" variant="outline" onClick={() => bannerInputRef.current?.click()} disabled={isUploadingBanner}>
                      {isUploadingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Thay Đổi Banner
                    </Button>
                  </div>
                </div>
              </div>

              {profileError && <p className="mt-4 text-sm text-red-400">{profileError}</p>}

              {isDirty && (
                <div className="flex items-center gap-3 mt-6 p-3 bg-[hsl(240,5%,16%)] rounded-md">
                  <span className="text-sm text-muted-foreground flex-1">Cẩn thận — bạn có thay đổi chưa lưu</span>
                  <button onClick={() => { setName(initialState.name); setIconUrl(initialState.iconUrl); setBannerUrl(initialState.bannerUrl); setProfileError(null) }} className="text-sm text-muted-foreground hover:text-foreground">Đặt lại</button>
                  <button onClick={() => void handleSaveProfile()} disabled={isSavingProfile} className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md disabled:opacity-70">
                    {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              )}
            </div>

            <div className="w-[300px] rounded-lg overflow-hidden bg-[hsl(240,6%,10%)] border border-border">
              <div className="h-[100px] bg-indigo-600 relative">
                {bannerUrl && <img src={bannerUrl} className="w-full h-full object-cover" />}
                <div className="absolute left-4 -bottom-8 w-16 h-16 rounded-full border-4 border-[hsl(240,6%,10%)] overflow-hidden bg-indigo-500 flex items-center justify-center">
                  {iconUrl ? <img src={iconUrl} className="w-full h-full object-cover" /> : <span className="text-white font-bold">{initialsFromName(name || server.name)}</span>}
                </div>
              </div>
              <div className="px-4 pt-10 pb-4">
                <p className="font-semibold text-foreground">{name || server.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">● {onlineMembers} Trực tuyến ● {totalMembers} thành viên</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="max-w-4xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="relative w-full max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Tìm thành viên..." className="pl-9" />
              </div>
            </div>
            {membersError && <p className="mb-3 text-sm text-red-400">{membersError}</p>}
            {loadingMembers ? <p className="text-sm text-muted-foreground">Đang tải thành viên...</p> : (
              <div className="space-y-2">
                {filteredMembers.map((member) => (
                  <div key={member.user.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 hover:bg-accent/50">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                      {member.user.username[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{member.user.username}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{member.roles[0]?.name ?? 'Member'}</span>
                        <span>•</span>
                        <span>Tham gia: —</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => void handleKick(member.user.id)}>Kick</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToast('Tính năng đang phát triển')}>Ban</DropdownMenuItem>
                        <Separator className="my-1" />
                        {roles.map((role) => (
                          <DropdownMenuItem key={role.id} onClick={() => void handleAssignRole(member.user.id, role.id)}>
                            {member.roles.some((assigned) => assigned.id === role.id) ? '✓ ' : ''}{role.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="max-w-5xl">
            {!editingRoleId && (
              <>
                <div className="mb-4 flex items-center gap-2">
                  <div className="relative w-full max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={roleSearch} onChange={(event) => setRoleSearch(event.target.value)} placeholder="Tìm vai trò..." className="pl-9" />
                  </div>
                  <Input value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} placeholder="Tên vai trò mới" className="max-w-xs" />
                  <input type="color" value={newRoleColor} onChange={(event) => setNewRoleColor(event.target.value.toUpperCase())} className="h-10 w-12 rounded border border-border bg-transparent p-1" />
                  <Button type="button" onClick={() => void handleCreateRole()} disabled={isCreatingRole}>
                    {isCreatingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Tạo Vai Trò
                  </Button>
                </div>
                {roleFormError && <p className="mb-3 text-sm text-red-400">{roleFormError}</p>}
                {rolesError && <p className="mb-3 text-sm text-red-400">{rolesError}</p>}
                {loadingRoles ? <p className="text-sm text-muted-foreground">Đang tải vai trò...</p> : (
                  <div className="space-y-2">
                    {filteredRoles.map((role) => (
                      <div key={role.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: role.color }} />
                        <span className="flex-1 text-sm">{role.name}</span>
                        <span className="text-xs text-muted-foreground">{roleMemberCount.get(role.id) ?? 0} thành viên</span>
                        <Button type="button" variant="ghost" onClick={() => setEditingRoleId(role.id)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingRoleId(role.id)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem disabled={role.is_everyone} onClick={() => void handleDeleteRole(role)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {editingRoleId && activeRole && roleDraft && (
              <div className="grid grid-cols-[280px_minmax(0,1fr)] gap-5">
                <div className="rounded-md border border-border p-3 bg-[hsl(240,6%,10%)]">
                  <button type="button" onClick={() => setEditingRoleId(null)} className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại
                  </button>
                  <div className="space-y-1">
                    {sortedRoles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setEditingRoleId(role.id)}
                        className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${role.id === activeRole.id ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                        <span className="truncate">{role.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative rounded-md border border-border bg-[hsl(240,6%,10%)] p-4 pb-20">
                  <div className="mb-4 flex items-center gap-2">
                    {[
                      ['display', 'Hiển thị'],
                      ['permissions', 'Quyền hạn'],
                      ['links', 'Liên kết'],
                      ['members', 'Quản lý thành viên'],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setEditorTab(key as 'display' | 'permissions' | 'links' | 'members')}
                        className={`rounded-md px-3 py-1.5 text-sm ${editorTab === key ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {editorTab === 'display' && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Tên vai trò</p>
                        <Input className="mt-2" value={roleDraft.name} onChange={(event) => setRoleDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev))} />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Màu sắc</p>
                        <div className="mt-2 flex items-center gap-2">
                          {roleSwatches.map((swatch) => {
                            const selected = roleDraft.color.toLowerCase() === swatch.toLowerCase()
                            return (
                              <button key={swatch} type="button" onClick={() => setRoleDraft((prev) => (prev ? { ...prev, color: swatch } : prev))} className="relative h-7 w-7 rounded-full" style={{ backgroundColor: swatch }}>
                                {selected && <Check className="absolute inset-0 m-auto h-4 w-4 text-black" />}
                              </button>
                            )
                          })}
                          <input type="color" value={roleDraft.color} onChange={(event) => setRoleDraft((prev) => (prev ? { ...prev, color: event.target.value.toUpperCase() } : prev))} className="h-8 w-10 rounded border border-border bg-transparent p-1" />
                        </div>
                      </div>
                    </div>
                  )}

                  {editorTab === 'permissions' && (
                    <div className="space-y-4">
                      <div className="relative max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input value={rolePermissionSearch} onChange={(event) => setRolePermissionSearch(event.target.value)} className="pl-9" placeholder="Tìm quyền..." />
                      </div>
                      {permissionGroups.map((group) => (
                        <div key={group.key} className="rounded-md border border-border p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-medium">{group.title}</p>
                            <button type="button" onClick={() => clearPermissionGroup(group.key)} className="text-xs text-muted-foreground hover:text-foreground">Xóa quyền</button>
                          </div>
                          <div className="space-y-2">
                            {group.items
                              .filter((item) => {
                                const key = rolePermissionSearch.trim().toLowerCase()
                                if (!key) return true
                                return item.name.toLowerCase().includes(key) || item.description.toLowerCase().includes(key)
                              })
                              .map((item) => {
                                const checked = roleDraft.permissions.includes(item.value)
                                return (
                                  <div key={item.value} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                                    <div>
                                      <p className="text-sm">{item.name}</p>
                                      <p className="text-xs text-muted-foreground">{item.description}</p>
                                    </div>
                                    <button type="button" onClick={() => toggleDraftPermission(item.value)} className={`h-6 w-11 rounded-full transition ${checked ? 'bg-green-600' : 'bg-muted'}`}>
                                      <span className={`block h-5 w-5 rounded-full bg-white transition ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </button>
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(editorTab === 'links' || editorTab === 'members') && (
                    <p className="text-sm text-muted-foreground">Mục này đang được phát triển.</p>
                  )}

                  {roleDirty && (
                    <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 border-t border-border bg-[hsl(240,8%,12%)] p-3">
                      <span className="flex-1 text-sm text-muted-foreground">Bạn có thay đổi chưa lưu</span>
                      {roleSaveError && <span className="text-xs text-red-400">{roleSaveError}</span>}
                      <button type="button" onClick={resetRoleDraft} className="text-sm text-muted-foreground hover:text-foreground">Đặt lại</button>
                      <button type="button" disabled={isSavingRole} onClick={() => void saveRoleDraft()} className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-70">
                        {isSavingRole ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'invites' && (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Input readOnly value={inviteLink} />
              <Button type="button" variant="outline" onClick={async () => { await navigator.clipboard.writeText(inviteLink); onToast('Đã sao chép liên kết mời.') }}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Button type="button" onClick={async () => {
              setInviteError(null)
              setIsCreatingInvite(true)
              try {
                const invite = await createServerInvite(serverId, { max_uses: 0 })
                setInviteCode(invite.code)
                onToast('Đã tạo liên kết mời.')
              } catch (error) {
                setInviteError(error instanceof Error ? error.message : 'Không thể tạo lời mời.')
              } finally {
                setIsCreatingInvite(false)
              }
            }} disabled={isCreatingInvite}>
              {isCreatingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Tạo liên kết mời
            </Button>
            {inviteError && <p className="text-sm text-red-400">{inviteError}</p>}
            <p className="text-sm text-muted-foreground">Danh sách lời mời hiện chưa được backend hỗ trợ endpoint liệt kê.</p>
          </div>
        )}

        {(activeTab === 'identity' || activeTab === 'interactions' || activeTab === 'audit') && (
          <div className="text-sm text-muted-foreground">Mục này đang được phát triển.</div>
        )}
      </main>

      {showCloseConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-md border border-border bg-[hsl(240,8%,12%)] p-4">
            <p className="text-sm text-foreground">Bạn có thay đổi chưa lưu. Đóng mà không lưu?</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCloseConfirm(false)}>Tiếp tục chỉnh sửa</Button>
              <Button type="button" onClick={() => { setShowCloseConfirm(false); onClose() }}>Đóng</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
