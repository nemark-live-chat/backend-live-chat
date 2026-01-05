/* =========================================================
   FILE: iam_full_schema.sql
   PURPOSE:
   - Identity & Access Management (IAM)
   - Multi-tenant SaaS
   - RBAC + Scope + Override
   - Fast authorization (O(1))

   DATABASE: SQL Server
   AUTHOR: Final validated version (with Lockout extensions)
========================================================= */

SET NOCOUNT ON;
SET XACT_ABORT ON;

------------------------------------------------------------
-- 0) SCHEMAS
------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'iam')
    EXEC('CREATE SCHEMA iam');
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'audit')
    EXEC('CREATE SCHEMA audit');
GO

------------------------------------------------------------
-- 1) USERS (global identity)
------------------------------------------------------------
IF OBJECT_ID('iam.Users', 'U') IS NULL
CREATE TABLE iam.Users (
    UserKey BIGINT IDENTITY(1,1) NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),

    Email NVARCHAR(320) NOT NULL,
    EmailNormalized NVARCHAR(320) NOT NULL,
    DisplayName NVARCHAR(200) NULL,

    Status TINYINT NOT NULL DEFAULT 1, -- 1=Active,2=Suspended,3=Deleted

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    RowVer ROWVERSION,

    CONSTRAINT PK_Users PRIMARY KEY CLUSTERED (UserKey),
    CONSTRAINT UQ_Users_UserId UNIQUE (UserId),
    CONSTRAINT UQ_Users_Email UNIQUE (EmailNormalized),
    CONSTRAINT CK_Users_Status CHECK (Status IN (1,2,3))
);
GO

------------------------------------------------------------
-- 2) USER CREDENTIALS
------------------------------------------------------------
IF OBJECT_ID('iam.UserCredentials', 'U') IS NULL
CREATE TABLE iam.UserCredentials (
    UserKey BIGINT NOT NULL,
    PasswordHash NVARCHAR(MAX) NOT NULL,
    PasswordAlgo NVARCHAR(30) NOT NULL,
    MustChangePassword BIT NOT NULL DEFAULT 0,

    -- Added for Security Rules (Account Lockout)
    FailedLoginAttempts TINYINT NOT NULL DEFAULT 0,
    LockUntil DATETIME2(3) NULL,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_UserCredentials PRIMARY KEY (UserKey),
    CONSTRAINT FK_UserCredentials_User
        FOREIGN KEY (UserKey) REFERENCES iam.Users(UserKey) ON DELETE CASCADE
);
GO

------------------------------------------------------------
-- 2b) REFRESH TOKENS (Start of Session Management)
------------------------------------------------------------
IF OBJECT_ID('iam.RefreshTokens', 'U') IS NULL
CREATE TABLE iam.RefreshTokens (
    RefreshTokenKey BIGINT IDENTITY(1,1) NOT NULL,
    UserKey BIGINT NOT NULL,
    TokenHash NVARCHAR(MAX) NOT NULL, -- Store hash, not raw token
    
    ExpiresAt DATETIME2(3) NOT NULL,
    RevokedAt DATETIME2(3) NULL,
    FamilyId UNIQUEIDENTIFIER NULL, -- For rotation families
    
    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedByIp NVARCHAR(50) NULL,
    UserAgent NVARCHAR(500) NULL,

    CONSTRAINT PK_RefreshTokens PRIMARY KEY (RefreshTokenKey),
    CONSTRAINT FK_RefreshTokens_User
        FOREIGN KEY (UserKey) REFERENCES iam.Users(UserKey) ON DELETE CASCADE
);
GO

------------------------------------------------------------
-- 3) WORKSPACES (tenant)
------------------------------------------------------------
IF OBJECT_ID('iam.Workspaces', 'U') IS NULL
CREATE TABLE iam.Workspaces (
    WorkspaceKey BIGINT IDENTITY(1,1) NOT NULL,
    WorkspaceId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),

    Name NVARCHAR(255) NOT NULL,
    Status TINYINT NOT NULL DEFAULT 1, -- 1=Active,2=Suspended

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Workspaces PRIMARY KEY CLUSTERED (WorkspaceKey),
    CONSTRAINT UQ_Workspaces_WorkspaceId UNIQUE (WorkspaceId),
    CONSTRAINT CK_Workspaces_Status CHECK (Status IN (1,2))
);
GO

------------------------------------------------------------
-- 4) MEMBERSHIPS (user in workspace)
------------------------------------------------------------
IF OBJECT_ID('iam.Memberships', 'U') IS NULL
CREATE TABLE iam.Memberships (
    MembershipKey BIGINT IDENTITY(1,1) NOT NULL,
    MembershipId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),

    WorkspaceKey BIGINT NOT NULL,
    UserKey BIGINT NOT NULL,

    Status TINYINT NOT NULL DEFAULT 1, -- 1=Active,2=Invited,3=Suspended

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Memberships PRIMARY KEY CLUSTERED (MembershipKey),
    CONSTRAINT UQ_Memberships UNIQUE (WorkspaceKey, UserKey),

    CONSTRAINT FK_Memberships_Workspace
        FOREIGN KEY (WorkspaceKey) REFERENCES iam.Workspaces(WorkspaceKey),
    CONSTRAINT FK_Memberships_User
        FOREIGN KEY (UserKey) REFERENCES iam.Users(UserKey)
);
GO

------------------------------------------------------------
-- 5) ROLES (per workspace)
------------------------------------------------------------
IF OBJECT_ID('iam.Roles', 'U') IS NULL
CREATE TABLE iam.Roles (
    RoleKey BIGINT IDENTITY(1,1) NOT NULL,
    RoleId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),

    WorkspaceKey BIGINT NOT NULL,
    Name NVARCHAR(100) NOT NULL,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Roles PRIMARY KEY CLUSTERED (RoleKey),
    CONSTRAINT UQ_Roles UNIQUE (WorkspaceKey, Name),
    CONSTRAINT FK_Roles_Workspace
        FOREIGN KEY (WorkspaceKey) REFERENCES iam.Workspaces(WorkspaceKey)
);
GO

------------------------------------------------------------
-- 6) MEMBERSHIP ROLES (N-N)
------------------------------------------------------------
IF OBJECT_ID('iam.MembershipRoles', 'U') IS NULL
CREATE TABLE iam.MembershipRoles (
    MembershipKey BIGINT NOT NULL,
    RoleKey BIGINT NOT NULL,

    CONSTRAINT PK_MembershipRoles PRIMARY KEY (MembershipKey, RoleKey),
    CONSTRAINT FK_MembershipRoles_Membership
        FOREIGN KEY (MembershipKey) REFERENCES iam.Memberships(MembershipKey) ON DELETE CASCADE,
    CONSTRAINT FK_MembershipRoles_Role
        FOREIGN KEY (RoleKey) REFERENCES iam.Roles(RoleKey)
);
GO

------------------------------------------------------------
-- 7) PERMISSIONS (global catalog)
------------------------------------------------------------
IF OBJECT_ID('iam.Permissions', 'U') IS NULL
CREATE TABLE iam.Permissions (
    PermissionKey INT IDENTITY(1,1) NOT NULL,
    Code NVARCHAR(150) NOT NULL, -- conversation.reply
    Resource NVARCHAR(80) NOT NULL,
    Action NVARCHAR(80) NOT NULL,

    CONSTRAINT PK_Permissions PRIMARY KEY (PermissionKey),
    CONSTRAINT UQ_Permissions_Code UNIQUE (Code)
);
GO

------------------------------------------------------------
-- 8) ROLE PERMISSION GRANTS
------------------------------------------------------------
IF OBJECT_ID('iam.RolePermissionGrants', 'U') IS NULL
CREATE TABLE iam.RolePermissionGrants (
    GrantKey BIGINT IDENTITY(1,1) NOT NULL,
    RoleKey BIGINT NOT NULL,
    PermissionKey INT NOT NULL,
    Effect TINYINT NOT NULL, -- 1=Allow,2=Deny

    CONSTRAINT PK_RolePermissionGrants PRIMARY KEY (GrantKey),
    CONSTRAINT UQ_RolePermissionGrants UNIQUE (RoleKey, PermissionKey),

    CONSTRAINT FK_RPG_Role
        FOREIGN KEY (RoleKey) REFERENCES iam.Roles(RoleKey),
    CONSTRAINT FK_RPG_Permission
        FOREIGN KEY (PermissionKey) REFERENCES iam.Permissions(PermissionKey),
    CONSTRAINT CK_RPG_Effect CHECK (Effect IN (1,2))
);
GO

------------------------------------------------------------
-- 9) RESOURCE TYPES
------------------------------------------------------------
IF OBJECT_ID('iam.ResourceTypes', 'U') IS NULL
CREATE TABLE iam.ResourceTypes (
    ResourceTypeKey SMALLINT IDENTITY(1,1) NOT NULL,
    Code NVARCHAR(50) NOT NULL, -- inbox, department, tag

    CONSTRAINT PK_ResourceTypes PRIMARY KEY (ResourceTypeKey),
    CONSTRAINT UQ_ResourceTypes_Code UNIQUE (Code)
);
GO

------------------------------------------------------------
-- 10) RESOURCES (scope registry)
------------------------------------------------------------
IF OBJECT_ID('iam.Resources', 'U') IS NULL
CREATE TABLE iam.Resources (
    ResourceKey BIGINT IDENTITY(1,1) NOT NULL,
    WorkspaceKey BIGINT NOT NULL,
    ResourceTypeKey SMALLINT NOT NULL,
    ExternalId UNIQUEIDENTIFIER NOT NULL,

    CONSTRAINT PK_Resources PRIMARY KEY CLUSTERED (ResourceKey),
    CONSTRAINT UQ_Resources UNIQUE (WorkspaceKey, ResourceTypeKey, ExternalId),

    CONSTRAINT FK_Resources_Workspace
        FOREIGN KEY (WorkspaceKey) REFERENCES iam.Workspaces(WorkspaceKey),
    CONSTRAINT FK_Resources_Type
        FOREIGN KEY (ResourceTypeKey) REFERENCES iam.ResourceTypes(ResourceTypeKey)
);
GO

------------------------------------------------------------
-- 11) GRANT SCOPES
------------------------------------------------------------
IF OBJECT_ID('iam.GrantScopes', 'U') IS NULL
BEGIN
    CREATE TABLE iam.GrantScopes (
        GrantKey BIGINT NOT NULL,
        ResourceKey BIGINT NULL, -- NULL = workspace-wide

        -- Non-null surrogate for PK
        ResourceKeyNN AS (ISNULL(ResourceKey, 0)) PERSISTED,

        CONSTRAINT PK_GrantScopes
            PRIMARY KEY (GrantKey, ResourceKeyNN),

        CONSTRAINT FK_GrantScopes_Grant
            FOREIGN KEY (GrantKey)
            REFERENCES iam.RolePermissionGrants(GrantKey) ON DELETE CASCADE,

        CONSTRAINT FK_GrantScopes_Resource
            FOREIGN KEY (ResourceKey)
            REFERENCES iam.Resources(ResourceKey)
    );

    CREATE INDEX IX_GrantScopes_Grant
    ON iam.GrantScopes (GrantKey, ResourceKeyNN);

    CREATE INDEX IX_GrantScopes_Resource
    ON iam.GrantScopes (ResourceKey)
    INCLUDE (GrantKey);
END
GO


------------------------------------------------------------
-- 12) MEMBERSHIP PERMISSION OVERRIDES
------------------------------------------------------------
IF OBJECT_ID('iam.MembershipPermissionOverrides', 'U') IS NULL
CREATE TABLE iam.MembershipPermissionOverrides (
    OverrideKey BIGINT IDENTITY(1,1) NOT NULL,
    MembershipKey BIGINT NOT NULL,
    PermissionKey INT NOT NULL,
    ResourceKey BIGINT NULL,
    Effect TINYINT NOT NULL, -- 1=Allow,2=Deny
    ExpiresAt DATETIME2(3) NULL,

    CONSTRAINT PK_MembershipOverrides PRIMARY KEY (OverrideKey),
    CONSTRAINT UQ_MembershipOverrides UNIQUE (MembershipKey, PermissionKey, ResourceKey),

    CONSTRAINT FK_MO_Membership
        FOREIGN KEY (MembershipKey) REFERENCES iam.Memberships(MembershipKey) ON DELETE CASCADE,
    CONSTRAINT FK_MO_Permission
        FOREIGN KEY (PermissionKey) REFERENCES iam.Permissions(PermissionKey),
    CONSTRAINT FK_MO_Resource
        FOREIGN KEY (ResourceKey) REFERENCES iam.Resources(ResourceKey),
    CONSTRAINT CK_MO_Effect CHECK (Effect IN (1,2))
);
GO

------------------------------------------------------------
-- 13) EFFECTIVE PERMISSIONS (FAST AUTHORIZATION)
------------------------------------------------------------
IF OBJECT_ID('iam.MembershipEffectivePermissions', 'U') IS NULL
BEGIN
    CREATE TABLE iam.MembershipEffectivePermissions (
        MembershipKey BIGINT NOT NULL,
        PermissionKey INT NOT NULL,
        ResourceKey BIGINT NULL,

        -- PK-safe column (NULL => 0 = workspace-wide)
        ResourceKeyNN AS (ISNULL(ResourceKey, 0)) PERSISTED,

        Effect TINYINT NOT NULL,      -- 1=Allow,2=Deny
        SourceType TINYINT NOT NULL,  -- 1=Role,2=Override

        CONSTRAINT PK_MembershipEffectivePermissions
            PRIMARY KEY (MembershipKey, PermissionKey, ResourceKeyNN, Effect, SourceType),

        CONSTRAINT FK_MEP_Membership
            FOREIGN KEY (MembershipKey) REFERENCES iam.Memberships(MembershipKey) ON DELETE CASCADE,
        CONSTRAINT FK_MEP_Permission
            FOREIGN KEY (PermissionKey) REFERENCES iam.Permissions(PermissionKey),
        CONSTRAINT FK_MEP_Resource
            FOREIGN KEY (ResourceKey) REFERENCES iam.Resources(ResourceKey)
    );

    CREATE INDEX IX_MEP_Authorize
    ON iam.MembershipEffectivePermissions (MembershipKey, PermissionKey, ResourceKeyNN, Effect);
END
GO

------------------------------------------------------------
-- 14) STORED PROCEDURE: REBUILD EFFECTIVE PERMISSIONS
------------------------------------------------------------
CREATE OR ALTER PROCEDURE iam.RebuildMembershipEffectivePermissions
    @MembershipKey BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM iam.MembershipEffectivePermissions
    WHERE MembershipKey = @MembershipKey;

    -- Role-based grants
    INSERT INTO iam.MembershipEffectivePermissions
        (MembershipKey, PermissionKey, ResourceKey, Effect, SourceType)
    SELECT
        @MembershipKey,
        g.PermissionKey,
        gs.ResourceKey,
        g.Effect,
        1
    FROM iam.MembershipRoles mr
    JOIN iam.RolePermissionGrants g ON g.RoleKey = mr.RoleKey
    LEFT JOIN iam.GrantScopes gs ON gs.GrantKey = g.GrantKey
    WHERE mr.MembershipKey = @MembershipKey;

    -- User overrides
    INSERT INTO iam.MembershipEffectivePermissions
        (MembershipKey, PermissionKey, ResourceKey, Effect, SourceType)
    SELECT
        o.MembershipKey,
        o.PermissionKey,
        o.ResourceKey,
        o.Effect,
        2
    FROM iam.MembershipPermissionOverrides o
    WHERE o.MembershipKey = @MembershipKey
      AND (o.ExpiresAt IS NULL OR o.ExpiresAt > SYSUTCDATETIME());
END;
GO
