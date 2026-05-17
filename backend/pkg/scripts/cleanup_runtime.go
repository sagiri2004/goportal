package scripts

import "gorm.io/gorm"

// CleanupLegacyRuntimeData removes old tournament runtime data and legacy
// tournament voice channels so local end-to-end scenarios start from a clean state.
func CleanupLegacyRuntimeData(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		// Remove explicit memberships first, then channels.
		if err := tx.Exec(`
			DELETE cm
			FROM channel_members cm
			INNER JOIN channels c ON c.id = cm.channel_id
			WHERE
				c.type = 'VOICE'
				AND (
					c.name LIKE 'team-a-%'
					OR c.name LIKE 'team-b-%'
					OR c.name LIKE 'caster-%'
					OR c.name LIKE 'admin-%'
					OR c.name LIKE 'spectator-%'
					OR c.name IN ('team-a-comms', 'team-b-comms', 'caster-booth', 'admin-observer', 'spectator-live')
				)
		`).Error; err != nil {
			return err
		}

		// Remove workspace voice/category channels.
		if err := tx.Exec(`
			DELETE FROM channels
			WHERE
				(type = 'CATEGORY' AND name LIKE 'match-r%-m%')
				OR (
					type = 'VOICE'
					AND (
						name LIKE 'team-a-%'
						OR name LIKE 'team-b-%'
						OR name LIKE 'caster-%'
						OR name LIKE 'admin-%'
						OR name LIKE 'spectator-%'
						OR name IN ('team-a-comms', 'team-b-comms', 'caster-booth', 'admin-observer', 'spectator-live')
					)
				)
		`).Error; err != nil {
			return err
		}

		// Reset tournament role/workspace runtime records.
		if err := tx.Exec("DELETE FROM tournament_match_workspaces").Error; err != nil {
			return err
		}
		if err := tx.Exec("DELETE FROM tournament_role_bindings").Error; err != nil {
			return err
		}
		if err := tx.Exec("DELETE FROM tournament_roles").Error; err != nil {
			return err
		}
		return nil
	})
}
