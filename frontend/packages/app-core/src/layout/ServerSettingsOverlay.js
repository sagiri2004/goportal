import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, Separator } from '@goportal/ui';
import { ArrowLeft, Check, Copy, Loader2, MoreHorizontal, Pencil, Plus, Search, Upload, X } from 'lucide-react';
import { createServerInvite, deleteServerRole, createServerRole, getServerMembersWithRoles, getServerRoles, kickServerMember, updateServerRole, updateServerMemberRoles, updateServerProfile, uploadServerMedia, uploadServerBanner, uploadRoleIcon, } from '../services';
const initialsFromName = (value) => value
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
const roleSwatches = ['#99AAB5', '#57F287', '#FEE75C', '#ED4245', '#5865F2', '#EB459E', '#1ABC9C'];
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
];
export const ServerSettingsOverlay = ({ open, initialTab = 'profile', serverId, server, onClose, onServerUpdated, onToast, }) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [name, setName] = useState(server.name);
    const [iconUrl, setIconUrl] = useState(server.iconUrl ?? null);
    const [bannerUrl, setBannerUrl] = useState(server.bannerUrl ?? null);
    const [initialState, setInitialState] = useState({
        name: server.name,
        iconUrl: server.iconUrl ?? null,
        bannerUrl: server.bannerUrl ?? null,
    });
    const [profileError, setProfileError] = useState(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUploadingIcon, setIsUploadingIcon] = useState(false);
    const [isUploadingBanner, setIsUploadingBanner] = useState(false);
    const [members, setMembers] = useState([]);
    const [memberSearch, setMemberSearch] = useState('');
    const [roles, setRoles] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [rolesError, setRolesError] = useState(null);
    const [membersError, setMembersError] = useState(null);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const [inviteCode, setInviteCode] = useState(null);
    const [inviteError, setInviteError] = useState(null);
    const [isCreatingInvite, setIsCreatingInvite] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleColor, setNewRoleColor] = useState('#99AAB5');
    const [roleSearch, setRoleSearch] = useState('');
    const [editingRoleId, setEditingRoleId] = useState(null);
    const [editorTab, setEditorTab] = useState('display');
    const [rolePermissionSearch, setRolePermissionSearch] = useState('');
    const [roleDraft, setRoleDraft] = useState(null);
    const [isSavingRole, setIsSavingRole] = useState(false);
    const [isUploadingRoleIcon, setIsUploadingRoleIcon] = useState(false);
    const [roleSaveError, setRoleSaveError] = useState(null);
    const [roleFormError, setRoleFormError] = useState(null);
    const [isCreatingRole, setIsCreatingRole] = useState(false);
    const iconInputRef = useRef(null);
    const bannerInputRef = useRef(null);
    const roleIconInputRef = useRef(null);
    const isDirty = name.trim() !== initialState.name ||
        (iconUrl ?? null) !== (initialState.iconUrl ?? null) ||
        (bannerUrl ?? null) !== (initialState.bannerUrl ?? null);
    const totalMembers = members.length;
    const onlineMembers = members.filter((item) => item.user.status === 'online' || item.user.status === 'idle' || item.user.status === 'dnd').length;
    const roleMemberCount = useMemo(() => {
        const counts = new Map();
        for (const member of members) {
            for (const role of member.roles) {
                counts.set(role.id, (counts.get(role.id) ?? 0) + 1);
            }
        }
        return counts;
    }, [members]);
    const filteredMembers = useMemo(() => {
        const keyword = memberSearch.trim().toLowerCase();
        if (!keyword) {
            return members;
        }
        return members.filter((member) => member.user.username.toLowerCase().includes(keyword));
    }, [memberSearch, members]);
    const sortedRoles = useMemo(() => {
        const everyone = roles.find((role) => role.is_everyone);
        const rest = roles
            .filter((role) => !role.is_everyone)
            .sort((a, b) => b.position - a.position || a.name.localeCompare(b.name));
        return everyone ? [...rest, everyone] : rest;
    }, [roles]);
    const filteredRoles = useMemo(() => {
        const keyword = roleSearch.trim().toLowerCase();
        if (!keyword) {
            return sortedRoles;
        }
        const everyone = sortedRoles.find((role) => role.is_everyone);
        const rest = sortedRoles.filter((role) => !role.is_everyone && role.name.toLowerCase().includes(keyword));
        if (everyone && everyone.name.toLowerCase().includes(keyword)) {
            return [...rest, everyone];
        }
        return everyone ? [...rest, everyone] : rest;
    }, [roleSearch, sortedRoles]);
    const activeRole = useMemo(() => (editingRoleId ? roles.find((role) => role.id === editingRoleId) ?? null : null), [editingRoleId, roles]);
    const roleDirty = useMemo(() => {
        if (!activeRole || !roleDraft) {
            return false;
        }
        const permsA = [...activeRole.permissions].sort().join('|');
        const permsB = [...roleDraft.permissions].sort().join('|');
        return (activeRole.name !== roleDraft.name ||
            (activeRole.icon_url ?? null) !== (roleDraft.iconUrl ?? null) ||
            activeRole.color.toLowerCase() !== roleDraft.color.toLowerCase() ||
            permsA !== permsB);
    }, [activeRole, roleDraft]);
    useEffect(() => {
        if (!open) {
            return;
        }
        setActiveTab(initialTab);
        setName(server.name);
        setIconUrl(server.iconUrl ?? null);
        setBannerUrl(server.bannerUrl ?? null);
        setInitialState({
            name: server.name,
            iconUrl: server.iconUrl ?? null,
            bannerUrl: server.bannerUrl ?? null,
        });
        setProfileError(null);
        setInviteCode(null);
        setInviteError(null);
    }, [initialTab, open, server.bannerUrl, server.iconUrl, server.name]);
    useEffect(() => {
        if (!open) {
            return;
        }
        const onEscape = (event) => {
            if (event.key !== 'Escape') {
                return;
            }
            if (isDirty) {
                setShowCloseConfirm(true);
                return;
            }
            onClose();
        };
        window.addEventListener('keydown', onEscape);
        return () => window.removeEventListener('keydown', onEscape);
    }, [isDirty, onClose, open]);
    useEffect(() => {
        if (!open || (activeTab !== 'members' && activeTab !== 'roles')) {
            return;
        }
        let cancelled = false;
        const loadMembers = async () => {
            setLoadingMembers(true);
            setMembersError(null);
            try {
                const data = await getServerMembersWithRoles(serverId);
                if (!cancelled) {
                    setMembers(data);
                }
            }
            catch (error) {
                if (!cancelled) {
                    setMembersError(error instanceof Error ? error.message : 'Không thể tải thành viên.');
                }
            }
            finally {
                if (!cancelled) {
                    setLoadingMembers(false);
                }
            }
        };
        void loadMembers();
        return () => {
            cancelled = true;
        };
    }, [activeTab, open, serverId]);
    useEffect(() => {
        if (!open || activeTab !== 'roles') {
            return;
        }
        let cancelled = false;
        const loadRoles = async () => {
            setLoadingRoles(true);
            setRolesError(null);
            try {
                const data = await getServerRoles(serverId);
                if (!cancelled) {
                    setRoles(data);
                }
            }
            catch (error) {
                if (!cancelled) {
                    setRolesError(error instanceof Error ? error.message : 'Không thể tải vai trò.');
                }
            }
            finally {
                if (!cancelled) {
                    setLoadingRoles(false);
                }
            }
        };
        void loadRoles();
        return () => {
            cancelled = true;
        };
    }, [activeTab, open, serverId]);
    useEffect(() => {
        if (!activeRole) {
            setRoleDraft(null);
            return;
        }
        setRoleDraft({
            name: activeRole.name,
            iconUrl: activeRole.icon_url ?? null,
            color: activeRole.color,
            permissions: [...activeRole.permissions],
        });
        setRoleSaveError(null);
        setRolePermissionSearch('');
        setEditorTab('display');
    }, [activeRole]);
    if (!open) {
        return null;
    }
    const handleUpload = async (file, type) => {
        if (type === 'icon') {
            setIsUploadingIcon(true);
        }
        else {
            setIsUploadingBanner(true);
        }
        try {
            const url = type === 'icon' ? await uploadServerMedia(file) : await uploadServerBanner(file);
            if (type === 'icon') {
                setIconUrl(url);
            }
            else {
                setBannerUrl(url);
            }
        }
        catch (error) {
            setProfileError(error instanceof Error ? error.message : 'Không thể tải ảnh lên.');
        }
        finally {
            if (type === 'icon') {
                setIsUploadingIcon(false);
            }
            else {
                setIsUploadingBanner(false);
            }
        }
    };
    const handleSaveProfile = async () => {
        const trimmed = name.trim();
        if (trimmed.length < 2 || trimmed.length > 100) {
            setProfileError('Tên máy chủ phải có từ 2 đến 100 ký tự.');
            return;
        }
        setIsSavingProfile(true);
        setProfileError(null);
        try {
            const body = {};
            if (trimmed !== initialState.name)
                body.name = trimmed;
            if ((iconUrl ?? null) !== (initialState.iconUrl ?? null))
                body.icon_url = iconUrl ?? '';
            if ((bannerUrl ?? null) !== (initialState.bannerUrl ?? null))
                body.banner_url = bannerUrl ?? '';
            if (Object.keys(body).length > 0) {
                await updateServerProfile(serverId, body);
                await onServerUpdated(serverId);
                setInitialState({
                    name: trimmed,
                    iconUrl: iconUrl ?? null,
                    bannerUrl: bannerUrl ?? null,
                });
                onToast('Đã lưu thay đổi máy chủ.');
            }
        }
        catch (error) {
            setProfileError(error instanceof Error ? error.message : 'Không thể lưu thay đổi.');
        }
        finally {
            setIsSavingProfile(false);
        }
    };
    const handleKick = async (userId) => {
        try {
            await kickServerMember(serverId, userId);
            setMembers((prev) => prev.filter((member) => member.user.id !== userId));
            onToast('Đã kick thành viên.');
        }
        catch (error) {
            setMembersError(error instanceof Error ? error.message : 'Không thể kick thành viên.');
        }
    };
    const handleAssignRole = async (userId, roleId) => {
        const target = members.find((member) => member.user.id === userId);
        if (!target) {
            return;
        }
        const currentRoleIds = target.roles.map((role) => role.id);
        const next = currentRoleIds.includes(roleId)
            ? currentRoleIds.filter((id) => id !== roleId)
            : [...currentRoleIds, roleId];
        try {
            await updateServerMemberRoles(serverId, userId, next);
            setMembers((prev) => prev.map((member) => member.user.id === userId
                ? { ...member, roles: roles.filter((role) => next.includes(role.id)) }
                : member));
            onToast('Đã cập nhật vai trò thành viên.');
        }
        catch (error) {
            setMembersError(error instanceof Error ? error.message : 'Không thể cập nhật vai trò.');
        }
    };
    const handleCreateRole = async () => {
        const trimmed = newRoleName.trim();
        if (!trimmed) {
            setRoleFormError('Tên vai trò là bắt buộc.');
            return;
        }
        setRoleFormError(null);
        setIsCreatingRole(true);
        try {
            const created = await createServerRole(serverId, { name: trimmed, color: newRoleColor, permissions: [] });
            setRoles((prev) => [...prev, created]);
            setNewRoleName('');
            setEditingRoleId(created.id);
        }
        catch (error) {
            setRoleFormError(error instanceof Error ? error.message : 'Không thể tạo vai trò.');
        }
        finally {
            setIsCreatingRole(false);
        }
    };
    const toggleDraftPermission = (permission) => {
        setRoleDraft((prev) => {
            if (!prev)
                return prev;
            const exists = prev.permissions.includes(permission);
            return {
                ...prev,
                permissions: exists ? prev.permissions.filter((item) => item !== permission) : [...prev.permissions, permission],
            };
        });
    };
    const clearPermissionGroup = (groupKey) => {
        const group = permissionGroups.find((item) => item.key === groupKey);
        if (!group)
            return;
        const values = new Set(group.items.map((item) => item.value));
        setRoleDraft((prev) => {
            if (!prev)
                return prev;
            return {
                ...prev,
                permissions: prev.permissions.filter((item) => !values.has(item)),
            };
        });
    };
    const resetRoleDraft = () => {
        if (!activeRole)
            return;
        setRoleDraft({
            name: activeRole.name,
            iconUrl: activeRole.icon_url ?? null,
            color: activeRole.color,
            permissions: [...activeRole.permissions],
        });
        setRoleSaveError(null);
    };
    const saveRoleDraft = async () => {
        if (!activeRole || !roleDraft)
            return;
        const body = {};
        if (roleDraft.name.trim() !== activeRole.name)
            body.name = roleDraft.name.trim();
        if ((roleDraft.iconUrl ?? null) !== (activeRole.icon_url ?? null))
            body.icon_url = roleDraft.iconUrl ?? '';
        if (roleDraft.color.toLowerCase() !== activeRole.color.toLowerCase())
            body.color = roleDraft.color;
        const currentPerms = [...activeRole.permissions].sort().join('|');
        const nextPerms = [...roleDraft.permissions].sort().join('|');
        if (currentPerms !== nextPerms)
            body.permissions = [...roleDraft.permissions];
        if (Object.keys(body).length === 0)
            return;
        setIsSavingRole(true);
        setRoleSaveError(null);
        try {
            const updated = await updateServerRole(serverId, activeRole.id, body);
            setRoles((prev) => prev.map((role) => (role.id === updated.id ? updated : role)));
            onToast('Đã lưu thay đổi vai trò.');
        }
        catch (error) {
            setRoleSaveError(error instanceof Error ? error.message : 'Không thể lưu vai trò.');
        }
        finally {
            setIsSavingRole(false);
        }
    };
    const handleDeleteRole = async (role) => {
        if (role.is_everyone) {
            return;
        }
        try {
            await deleteServerRole(serverId, role.id);
            setRoles((prev) => prev.filter((item) => item.id !== role.id));
            if (editingRoleId === role.id) {
                setEditingRoleId(null);
            }
            onToast('Đã xóa vai trò.');
        }
        catch (error) {
            setRoleFormError(error instanceof Error ? error.message : 'Không thể xóa vai trò.');
        }
    };
    const handleUploadRoleIcon = async (file) => {
        setIsUploadingRoleIcon(true);
        setRoleSaveError(null);
        try {
            const url = await uploadRoleIcon(file);
            setRoleDraft((prev) => (prev ? { ...prev, iconUrl: url } : prev));
        }
        catch (error) {
            setRoleSaveError(error instanceof Error ? error.message : 'Không thể tải ảnh vai trò.');
        }
        finally {
            setIsUploadingRoleIcon(false);
        }
    };
    const inviteLink = inviteCode ? `${window.location.origin}/invite/${inviteCode}` : `${window.location.origin}/invite/${serverId}`;
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex bg-[hsl(240,8%,12%)]", children: [_jsxs("aside", { className: "w-[220px] border-r border-border px-3 py-6", children: [_jsxs("p", { className: "px-2 text-xs uppercase tracking-wide text-muted-foreground", children: ["M\u00C1Y CH\u1EE6 C\u1EE6A ", server.name] }), _jsx("div", { className: "mt-2 space-y-0.5", children: [
                            ['profile', 'Hồ Sơ Máy Chủ'],
                            ['identity', 'Số Nhận Diện Máy Chủ'],
                            ['interactions', 'Tương Tác'],
                        ].map(([key, label]) => (_jsx("button", { type: "button", onClick: () => setActiveTab(key), className: `w-full px-2 py-1.5 rounded-md text-sm text-left cursor-pointer hover:bg-accent hover:text-foreground ${activeTab === key ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground'}`, children: label }, key))) }), _jsx("p", { className: "mt-5 px-2 text-xs uppercase tracking-wide text-muted-foreground", children: "M\u1ECCI NG\u01AF\u1EDCI" }), _jsx("div", { className: "mt-2 space-y-0.5", children: [
                            ['members', 'Thành viên'],
                            ['roles', 'Vai trò'],
                            ['invites', 'Lời mời'],
                        ].map(([key, label]) => (_jsx("button", { type: "button", onClick: () => setActiveTab(key), className: `w-full px-2 py-1.5 rounded-md text-sm text-left cursor-pointer hover:bg-accent hover:text-foreground ${activeTab === key ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground'}`, children: label }, key))) }), _jsx("p", { className: "mt-5 px-2 text-xs uppercase tracking-wide text-muted-foreground", children: "\u0110I\u1EC0U CH\u1EC8NH" }), _jsx("button", { type: "button", onClick: () => setActiveTab('audit'), className: `mt-2 w-full px-2 py-1.5 rounded-md text-sm text-left cursor-pointer hover:bg-accent hover:text-foreground ${activeTab === 'audit' ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground'}`, children: "Nh\u1EADt K\u00FD Ch\u1EC9nh S\u1EEDa" }), _jsx(Separator, { className: "my-4" }), _jsx("button", { type: "button", className: "w-full px-2 py-1.5 rounded-md text-sm text-left text-red-400 hover:bg-red-500/10", children: "Xo\u00E1 m\u00E1y ch\u1EE7" })] }), _jsxs("main", { className: "relative flex-1 p-8 overflow-y-auto", children: [_jsx("button", { type: "button", onClick: () => (isDirty ? setShowCloseConfirm(true) : onClose()), className: "absolute right-6 top-6 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground", children: _jsx(X, { className: "w-5 h-5" }) }), activeTab === 'profile' && (_jsxs("div", { className: "flex gap-8", children: [_jsxs("div", { className: "flex-1 max-w-2xl", children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-muted-foreground", children: "T\u00CAN" }), _jsx(Input, { value: name, onChange: (event) => setName(event.target.value), className: "mt-2" }), _jsxs("div", { className: "mt-6", children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-muted-foreground", children: "\u1EA2NH M\u00C1Y CH\u1EE6" }), _jsxs("div", { className: "mt-2 rounded-lg border border-border bg-[hsl(240,6%,10%)] overflow-hidden", children: [_jsxs("div", { className: "relative h-[140px] bg-indigo-600", children: [bannerUrl && _jsx("img", { src: bannerUrl, className: "w-full h-full object-cover" }), _jsx("div", { className: "absolute left-4 -bottom-10 w-20 h-20 rounded-full border-4 border-[hsl(240,6%,10%)] overflow-hidden bg-accent flex items-center justify-center", children: iconUrl ? _jsx("img", { src: iconUrl, className: "w-full h-full object-cover" }) : _jsx("span", { className: "font-semibold", children: initialsFromName(name || server.name) }) })] }), _jsxs("div", { className: "pt-12 px-4 pb-4 space-y-3", children: [_jsx("input", { ref: iconInputRef, type: "file", accept: "image/*", className: "hidden", onChange: (event) => { const file = event.target.files?.[0]; if (file)
                                                                    void handleUpload(file, 'icon'); } }), _jsxs(Button, { type: "button", variant: "outline", onClick: () => iconInputRef.current?.click(), disabled: isUploadingIcon, children: [isUploadingIcon ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : _jsx(Upload, { className: "w-4 h-4" }), "Thay \u0110\u1ED5i Bi\u1EC3u T\u01B0\u1EE3ng M\u00E1y Ch\u1EE7"] }), _jsx("input", { ref: bannerInputRef, type: "file", accept: "image/*", className: "hidden", onChange: (event) => { const file = event.target.files?.[0]; if (file)
                                                                    void handleUpload(file, 'banner'); } }), _jsxs(Button, { type: "button", variant: "outline", onClick: () => bannerInputRef.current?.click(), disabled: isUploadingBanner, children: [isUploadingBanner ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : _jsx(Upload, { className: "w-4 h-4" }), "Thay \u0110\u1ED5i Banner"] })] })] })] }), profileError && _jsx("p", { className: "mt-4 text-sm text-red-400", children: profileError }), isDirty && (_jsxs("div", { className: "flex items-center gap-3 mt-6 p-3 bg-[hsl(240,5%,16%)] rounded-md", children: [_jsx("span", { className: "text-sm text-muted-foreground flex-1", children: "C\u1EA9n th\u1EADn \u2014 b\u1EA1n c\u00F3 thay \u0111\u1ED5i ch\u01B0a l\u01B0u" }), _jsx("button", { onClick: () => { setName(initialState.name); setIconUrl(initialState.iconUrl); setBannerUrl(initialState.bannerUrl); setProfileError(null); }, className: "text-sm text-muted-foreground hover:text-foreground", children: "\u0110\u1EB7t l\u1EA1i" }), _jsx("button", { onClick: () => void handleSaveProfile(), disabled: isSavingProfile, className: "px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md disabled:opacity-70", children: isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi' })] }))] }), _jsxs("div", { className: "w-[300px] rounded-lg overflow-hidden bg-[hsl(240,6%,10%)] border border-border", children: [_jsxs("div", { className: "h-[100px] bg-indigo-600 relative", children: [bannerUrl && _jsx("img", { src: bannerUrl, className: "w-full h-full object-cover" }), _jsx("div", { className: "absolute left-4 -bottom-8 w-16 h-16 rounded-full border-4 border-[hsl(240,6%,10%)] overflow-hidden bg-indigo-500 flex items-center justify-center", children: iconUrl ? _jsx("img", { src: iconUrl, className: "w-full h-full object-cover" }) : _jsx("span", { className: "text-white font-bold", children: initialsFromName(name || server.name) }) })] }), _jsxs("div", { className: "px-4 pt-10 pb-4", children: [_jsx("p", { className: "font-semibold text-foreground", children: name || server.name }), _jsxs("p", { className: "text-xs text-muted-foreground mt-0.5", children: ["\u25CF ", onlineMembers, " Tr\u1EF1c tuy\u1EBFn \u25CF ", totalMembers, " th\u00E0nh vi\u00EAn"] })] })] })] })), activeTab === 'members' && (_jsxs("div", { className: "max-w-4xl", children: [_jsx("div", { className: "flex items-center justify-between gap-3 mb-4", children: _jsxs("div", { className: "relative w-full max-w-md", children: [_jsx(Search, { className: "w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" }), _jsx(Input, { value: memberSearch, onChange: (event) => setMemberSearch(event.target.value), placeholder: "T\u00ECm th\u00E0nh vi\u00EAn...", className: "pl-9" })] }) }), membersError && _jsx("p", { className: "mb-3 text-sm text-red-400", children: membersError }), loadingMembers ? _jsx("p", { className: "text-sm text-muted-foreground", children: "\u0110ang t\u1EA3i th\u00E0nh vi\u00EAn..." }) : (_jsx("div", { className: "space-y-2", children: filteredMembers.map((member) => (_jsxs("div", { className: "flex items-center gap-3 rounded-md border border-border px-3 py-2 hover:bg-accent/50", children: [_jsx("div", { className: "w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold", children: member.user.username[0]?.toUpperCase() ?? '?' }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-sm font-medium truncate", children: member.user.username }), _jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground", children: [_jsx("span", { children: member.roles[0]?.name ?? 'Member' }), _jsx("span", { children: "\u2022" }), _jsx("span", { children: "Tham gia: \u2014" })] })] }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx("button", { type: "button", className: "p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", children: _jsx(MoreHorizontal, { className: "w-4 h-4" }) }) }), _jsxs(DropdownMenuContent, { align: "end", className: "w-52", children: [_jsx(DropdownMenuItem, { onClick: () => void handleKick(member.user.id), children: "Kick" }), _jsx(DropdownMenuItem, { onClick: () => onToast('Tính năng đang phát triển'), children: "Ban" }), _jsx(Separator, { className: "my-1" }), roles.map((role) => (_jsxs(DropdownMenuItem, { onClick: () => void handleAssignRole(member.user.id, role.id), children: [member.roles.some((assigned) => assigned.id === role.id) ? '✓ ' : '', role.name] }, role.id)))] })] })] }, member.user.id))) }))] })), activeTab === 'roles' && (_jsxs("div", { className: "max-w-5xl", children: [!editingRoleId && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-4 flex items-center gap-2", children: [_jsxs("div", { className: "relative w-full max-w-md", children: [_jsx(Search, { className: "w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" }), _jsx(Input, { value: roleSearch, onChange: (event) => setRoleSearch(event.target.value), placeholder: "T\u00ECm vai tr\u00F2...", className: "pl-9" })] }), _jsx(Input, { value: newRoleName, onChange: (event) => setNewRoleName(event.target.value), placeholder: "T\u00EAn vai tr\u00F2 m\u1EDBi", className: "max-w-xs" }), _jsx("input", { type: "color", value: newRoleColor, onChange: (event) => setNewRoleColor(event.target.value.toUpperCase()), className: "h-10 w-12 rounded border border-border bg-transparent p-1" }), _jsxs(Button, { type: "button", onClick: () => void handleCreateRole(), disabled: isCreatingRole, children: [isCreatingRole ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : _jsx(Plus, { className: "w-4 h-4" }), "T\u1EA1o Vai Tr\u00F2"] })] }), roleFormError && _jsx("p", { className: "mb-3 text-sm text-red-400", children: roleFormError }), rolesError && _jsx("p", { className: "mb-3 text-sm text-red-400", children: rolesError }), loadingRoles ? _jsx("p", { className: "text-sm text-muted-foreground", children: "\u0110ang t\u1EA3i vai tr\u00F2..." }) : (_jsx("div", { className: "space-y-2", children: filteredRoles.map((role) => (_jsxs("div", { className: "flex items-center gap-3 rounded-md border border-border px-3 py-2", children: [role.icon_url ? (_jsx("img", { src: role.icon_url, alt: role.name, className: "h-5 w-5 rounded-full object-cover" })) : (_jsx("span", { className: "w-2.5 h-2.5 rounded-full", style: { backgroundColor: role.color } })), _jsx("span", { className: "flex-1 text-sm", children: role.name }), _jsxs("span", { className: "text-xs text-muted-foreground", children: [roleMemberCount.get(role.id) ?? 0, " th\u00E0nh vi\u00EAn"] }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => setEditingRoleId(role.id), children: _jsx(Pencil, { className: "w-4 h-4" }) }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx("button", { type: "button", className: "p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", children: _jsx(MoreHorizontal, { className: "w-4 h-4" }) }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuItem, { onClick: () => setEditingRoleId(role.id), children: "Edit" }), _jsx(DropdownMenuItem, { disabled: role.is_everyone, onClick: () => void handleDeleteRole(role), children: "Delete" })] })] })] }, role.id))) }))] })), editingRoleId && activeRole && roleDraft && (_jsxs("div", { className: "grid grid-cols-[280px_minmax(0,1fr)] gap-5", children: [_jsxs("div", { className: "rounded-md border border-border p-3 bg-[hsl(240,6%,10%)]", children: [_jsxs("button", { type: "button", onClick: () => setEditingRoleId(null), className: "mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground", children: [_jsx(ArrowLeft, { className: "w-4 h-4" }), "Quay l\u1EA1i"] }), _jsx("div", { className: "space-y-1", children: sortedRoles.map((role) => (_jsxs("button", { type: "button", onClick: () => setEditingRoleId(role.id), className: `w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${role.id === activeRole.id ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`, children: [_jsx("span", { className: "w-2 h-2 rounded-full", style: { backgroundColor: role.color } }), _jsx("span", { className: "truncate", children: role.name })] }, role.id))) })] }), _jsxs("div", { className: "relative rounded-md border border-border bg-[hsl(240,6%,10%)] p-4 pb-20", children: [_jsx("div", { className: "mb-4 flex items-center gap-2", children: [
                                                    ['display', 'Hiển thị'],
                                                    ['permissions', 'Quyền hạn'],
                                                    ['links', 'Liên kết'],
                                                    ['members', 'Quản lý thành viên'],
                                                ].map(([key, label]) => (_jsx("button", { type: "button", onClick: () => setEditorTab(key), className: `rounded-md px-3 py-1.5 text-sm ${editorTab === key ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`, children: label }, key))) }), editorTab === 'display' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-muted-foreground", children: "T\u00EAn vai tr\u00F2" }), _jsx(Input, { className: "mt-2", value: roleDraft.name, onChange: (event) => setRoleDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev)) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-muted-foreground", children: "Bi\u1EC3u t\u01B0\u1EE3ng vai tr\u00F2" }), _jsxs("div", { className: "mt-2 flex items-center gap-3", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-accent", children: roleDraft.iconUrl ? (_jsx("img", { src: roleDraft.iconUrl, alt: roleDraft.name, className: "h-full w-full object-cover" })) : (_jsx("span", { className: "text-xs font-semibold", children: roleDraft.name[0]?.toUpperCase() ?? 'R' })) }), _jsx("input", { ref: roleIconInputRef, type: "file", accept: "image/*", className: "hidden", onChange: (event) => {
                                                                            const file = event.target.files?.[0];
                                                                            if (file) {
                                                                                void handleUploadRoleIcon(file);
                                                                            }
                                                                        } }), _jsxs(Button, { type: "button", variant: "outline", onClick: () => roleIconInputRef.current?.click(), disabled: isUploadingRoleIcon, children: [isUploadingRoleIcon ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(Upload, { className: "h-4 w-4" }), "T\u1EA3i \u1EA3nh"] }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => setRoleDraft((prev) => (prev ? { ...prev, iconUrl: null } : prev)), disabled: isUploadingRoleIcon, children: "X\u00F3a" })] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-muted-foreground", children: "M\u00E0u s\u1EAFc" }), _jsxs("div", { className: "mt-2 flex items-center gap-2", children: [roleSwatches.map((swatch) => {
                                                                        const selected = roleDraft.color.toLowerCase() === swatch.toLowerCase();
                                                                        return (_jsx("button", { type: "button", onClick: () => setRoleDraft((prev) => (prev ? { ...prev, color: swatch } : prev)), className: "relative h-7 w-7 rounded-full", style: { backgroundColor: swatch }, children: selected && _jsx(Check, { className: "absolute inset-0 m-auto h-4 w-4 text-black" }) }, swatch));
                                                                    }), _jsx("input", { type: "color", value: roleDraft.color, onChange: (event) => setRoleDraft((prev) => (prev ? { ...prev, color: event.target.value.toUpperCase() } : prev)), className: "h-8 w-10 rounded border border-border bg-transparent p-1" })] })] })] })), editorTab === 'permissions' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "relative max-w-md", children: [_jsx(Search, { className: "w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" }), _jsx(Input, { value: rolePermissionSearch, onChange: (event) => setRolePermissionSearch(event.target.value), className: "pl-9", placeholder: "T\u00ECm quy\u1EC1n..." })] }), permissionGroups.map((group) => (_jsxs("div", { className: "rounded-md border border-border p-3", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx("p", { className: "text-sm font-medium", children: group.title }), _jsx("button", { type: "button", onClick: () => clearPermissionGroup(group.key), className: "text-xs text-muted-foreground hover:text-foreground", children: "X\u00F3a quy\u1EC1n" })] }), _jsx("div", { className: "space-y-2", children: group.items
                                                                    .filter((item) => {
                                                                    const key = rolePermissionSearch.trim().toLowerCase();
                                                                    if (!key)
                                                                        return true;
                                                                    return item.name.toLowerCase().includes(key) || item.description.toLowerCase().includes(key);
                                                                })
                                                                    .map((item) => {
                                                                    const checked = roleDraft.permissions.includes(item.value);
                                                                    return (_jsxs("div", { className: "flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm", children: item.name }), _jsx("p", { className: "text-xs text-muted-foreground", children: item.description })] }), _jsx("button", { type: "button", onClick: () => toggleDraftPermission(item.value), className: `h-6 w-11 rounded-full transition ${checked ? 'bg-green-600' : 'bg-muted'}`, children: _jsx("span", { className: `block h-5 w-5 rounded-full bg-white transition ${checked ? 'translate-x-5' : 'translate-x-0.5'}` }) })] }, item.value));
                                                                }) })] }, group.key)))] })), (editorTab === 'links' || editorTab === 'members') && (_jsx("p", { className: "text-sm text-muted-foreground", children: "M\u1EE5c n\u00E0y \u0111ang \u0111\u01B0\u1EE3c ph\u00E1t tri\u1EC3n." })), roleDirty && (_jsxs("div", { className: "absolute bottom-0 left-0 right-0 flex items-center gap-3 border-t border-border bg-[hsl(240,8%,12%)] p-3", children: [_jsx("span", { className: "flex-1 text-sm text-muted-foreground", children: "B\u1EA1n c\u00F3 thay \u0111\u1ED5i ch\u01B0a l\u01B0u" }), roleSaveError && _jsx("span", { className: "text-xs text-red-400", children: roleSaveError }), _jsx("button", { type: "button", onClick: resetRoleDraft, className: "text-sm text-muted-foreground hover:text-foreground", children: "\u0110\u1EB7t l\u1EA1i" }), _jsx("button", { type: "button", disabled: isSavingRole, onClick: () => void saveRoleDraft(), className: "rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-70", children: isSavingRole ? 'Đang lưu...' : 'Lưu thay đổi' })] }))] })] }))] })), activeTab === 'invites' && (_jsxs("div", { className: "max-w-2xl space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Input, { readOnly: true, value: inviteLink }), _jsx(Button, { type: "button", variant: "outline", onClick: async () => { await navigator.clipboard.writeText(inviteLink); onToast('Đã sao chép liên kết mời.'); }, children: _jsx(Copy, { className: "w-4 h-4" }) })] }), _jsxs(Button, { type: "button", onClick: async () => {
                                    setInviteError(null);
                                    setIsCreatingInvite(true);
                                    try {
                                        const invite = await createServerInvite(serverId, { max_uses: 0 });
                                        setInviteCode(invite.invite_code);
                                        onToast('Đã tạo liên kết mời.');
                                    }
                                    catch (error) {
                                        setInviteError(error instanceof Error ? error.message : 'Không thể tạo lời mời.');
                                    }
                                    finally {
                                        setIsCreatingInvite(false);
                                    }
                                }, disabled: isCreatingInvite, children: [isCreatingInvite ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : null, "T\u1EA1o li\u00EAn k\u1EBFt m\u1EDDi"] }), inviteError && _jsx("p", { className: "text-sm text-red-400", children: inviteError }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Danh s\u00E1ch l\u1EDDi m\u1EDDi hi\u1EC7n ch\u01B0a \u0111\u01B0\u1EE3c backend h\u1ED7 tr\u1EE3 endpoint li\u1EC7t k\u00EA." })] })), (activeTab === 'identity' || activeTab === 'interactions' || activeTab === 'audit') && (_jsx("div", { className: "text-sm text-muted-foreground", children: "M\u1EE5c n\u00E0y \u0111ang \u0111\u01B0\u1EE3c ph\u00E1t tri\u1EC3n." }))] }), showCloseConfirm && (_jsx("div", { className: "fixed inset-0 z-[60] flex items-center justify-center bg-black/40", children: _jsxs("div", { className: "w-full max-w-sm rounded-md border border-border bg-[hsl(240,8%,12%)] p-4", children: [_jsx("p", { className: "text-sm text-foreground", children: "B\u1EA1n c\u00F3 thay \u0111\u1ED5i ch\u01B0a l\u01B0u. \u0110\u00F3ng m\u00E0 kh\u00F4ng l\u01B0u?" }), _jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => setShowCloseConfirm(false), children: "Ti\u1EBFp t\u1EE5c ch\u1EC9nh s\u1EEDa" }), _jsx(Button, { type: "button", onClick: () => { setShowCloseConfirm(false); onClose(); }, children: "\u0110\u00F3ng" })] })] }) }))] }));
};
//# sourceMappingURL=ServerSettingsOverlay.js.map