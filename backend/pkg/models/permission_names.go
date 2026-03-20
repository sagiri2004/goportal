package models

import "sort"

var permissionNameToValue = map[string]int64{
	"VIEW_CHANNEL":         PermissionViewChannel,
	"SEND_MESSAGES":        PermissionSendMessages,
	"READ_MESSAGES":        PermissionReadMessages,
	"ADMINISTRATOR":        PermissionAdministrator,
	"MANAGE_SERVER":        PermissionManageServer,
	"CREATE_INVITE":        PermissionCreateInvite,
	"READ_MESSAGE_HISTORY": PermissionReadMessageHistory,
	"MANAGE_MESSAGES":      PermissionManageMessages,
	"ATTACH_FILES":         PermissionAttachFiles,
	"EMBED_LINKS":          PermissionEmbedLinks,
	"ADD_REACTIONS":        PermissionAddReactions,
	"MANAGE_CHANNELS":      PermissionManageChannels,
	"MANAGE_ROLES":         PermissionManageRoles,
	"KICK_MEMBERS":         PermissionKickMembers,
	"BAN_MEMBERS":          PermissionBanMembers,
	"APPROVE_MEMBERS":      PermissionApproveMembers,
}

var orderedPermissionNames = []string{
	"VIEW_CHANNEL",
	"SEND_MESSAGES",
	"READ_MESSAGES",
	"ADMINISTRATOR",
	"MANAGE_SERVER",
	"CREATE_INVITE",
	"READ_MESSAGE_HISTORY",
	"MANAGE_MESSAGES",
	"ATTACH_FILES",
	"EMBED_LINKS",
	"ADD_REACTIONS",
	"MANAGE_CHANNELS",
	"MANAGE_ROLES",
	"KICK_MEMBERS",
	"BAN_MEMBERS",
	"APPROVE_MEMBERS",
}

func PermissionValueByName(name string) (int64, bool) {
	value, ok := permissionNameToValue[name]
	return value, ok
}

func PermissionNamesFromBitset(bitset int64) []string {
	names := make([]string, 0, len(orderedPermissionNames))
	for _, name := range orderedPermissionNames {
		value := permissionNameToValue[name]
		if (bitset & value) == value {
			names = append(names, name)
		}
	}
	sort.Strings(names)
	return names
}
