-- +goose Up
CREATE TABLE IF NOT EXISTS permissions (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  name VARCHAR(64) NOT NULL,
  value BIGINT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_name (name),
  UNIQUE KEY uq_permissions_value (value),
  KEY idx_permissions_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  server_id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  permissions BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_server_name (server_id, name),
  KEY idx_roles_deleted_at (deleted_at),
  KEY idx_roles_server_id (server_id),
  CONSTRAINT fk_roles_server FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  role_id CHAR(36) NOT NULL,
  permission_id CHAR(36) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_role_permissions_role_perm (role_id, permission_id),
  KEY idx_role_permissions_deleted_at (deleted_at),
  KEY idx_role_permissions_role_id (role_id),
  KEY idx_role_permissions_permission_id (permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS server_member_role (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  server_member_id CHAR(36) NOT NULL,
  role_id CHAR(36) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_server_member_role_member_role (server_member_id, role_id),
  KEY idx_server_member_role_deleted_at (deleted_at),
  KEY idx_server_member_role_member_id (server_member_id),
  KEY idx_server_member_role_role_id (role_id),
  CONSTRAINT fk_server_member_role_member FOREIGN KEY (server_member_id) REFERENCES server_members(id) ON DELETE CASCADE,
  CONSTRAINT fk_server_member_role_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS server_invites (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  server_id CHAR(36) NOT NULL,
  inviter_id CHAR(36) NOT NULL,
  code VARCHAR(32) NOT NULL,
  max_uses INT NOT NULL DEFAULT 0,
  uses INT NOT NULL DEFAULT 0,
  expires_at BIGINT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_server_invites_code (code),
  KEY idx_server_invites_deleted_at (deleted_at),
  KEY idx_server_invites_server_id (server_id),
  KEY idx_server_invites_inviter_id (inviter_id),
  CONSTRAINT fk_server_invites_server FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
  CONSTRAINT fk_server_invites_inviter FOREIGN KEY (inviter_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE servers
  ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE AFTER owner_id,
  ADD COLUMN default_role_id CHAR(36) NULL AFTER is_public,
  ADD KEY idx_servers_default_role_id (default_role_id),
  ADD CONSTRAINT fk_servers_default_role FOREIGN KEY (default_role_id) REFERENCES roles(id) ON DELETE SET NULL;

-- +goose Down
ALTER TABLE servers
  DROP FOREIGN KEY fk_servers_default_role,
  DROP KEY idx_servers_default_role_id,
  DROP COLUMN default_role_id,
  DROP COLUMN is_public;

DROP TABLE IF EXISTS server_invites;
DROP TABLE IF EXISTS server_member_role;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS permissions;
