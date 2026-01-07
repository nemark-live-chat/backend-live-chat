USE  [live_chat_nemark]
GO
/****** Object:  Schema [audit]    Script Date: 1/6/2026 2:49:30 AM ******/
CREATE SCHEMA [audit]
GO
/****** Object:  Schema [iam]    Script Date: 1/6/2026 2:49:30 AM ******/
CREATE SCHEMA [iam]
GO
/****** Object:  Table [iam].[GrantScopes]    Script Date: 1/6/2026 2:49:30 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [iam].[GrantScopes](
	[GrantKey] [bigint] NOT NULL,
	[ResourceKey] [bigint] NULL,
	[ResourceKeyNN]  AS (isnull([ResourceKey],(0))) PERSISTED NOT NULL,
 CONSTRAINT [PK_GrantScopes] PRIMARY KEY CLUSTERED 
(
	[GrantKey] ASC,
	[ResourceKeyNN] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [iam].[MembershipEffectivePermissions]    Script Date: 1/6/2026 2:49:30 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [iam].[MembershipEffectivePermissions](
	[MembershipKey] [bigint] NOT NULL,
	[PermissionKey] [int] NOT NULL,
	[ResourceKey] [bigint] NULL,
	[ResourceKeyNN]  AS (isnull([ResourceKey],(0))) PERSISTED NOT NULL,
	[Effect] [tinyint] NOT NULL,
	[SourceType] [tinyint] NOT NULL,
 CONSTRAINT [PK_MembershipEffectivePermissions] PRIMARY KEY CLUSTERED 
(
	[MembershipKey] ASC,
	[PermissionKey] ASC,
	[ResourceKeyNN] ASC,
	[Effect] ASC,
	[SourceType] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [iam].[MembershipPermissionOverrides]    Script Date: 1/6/2026 2:49:30 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [iam].[MembershipPermissionOverrides](
	[OverrideKey] [bigint] IDENTITY(1,1) NOT NULL,
	[MembershipKey] [bigint] NOT NULL,
	[PermissionKey] [int] NOT NULL,
	[ResourceKey] [bigint] NULL,
	[Effect] [tinyint] NOT NULL,
	[ExpiresAt] [datetime2](3) NULL,
 CONSTRAINT [PK_MembershipOverrides] PRIMARY KEY CLUSTERED 
(
	[OverrideKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_MembershipOverrides] UNIQUE NONCLUSTERED 
(
	[MembershipKey] ASC,
	[PermissionKey] ASC,
	[ResourceKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [iam].[MembershipRoles]    Script Date: 1/6/2026 2:49:30 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [iam].[MembershipRoles](
	[MembershipKey] [bigint] NOT NULL,
	[RoleKey] [bigint] NOT NULL,
 CONSTRAINT [PK_MembershipRoles] PRIMARY KEY CLUSTERED 
(
	[MembershipKey] ASC,
	[RoleKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [iam].[Memberships]    Script Date: 1/6/2026 2:49:30 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [iam].[Memberships](
	[MembershipKey] [bigint] IDENTITY(1,1) NOT NULL,
	[MembershipId] [uniqueidentifier] NOT NULL,
	[WorkspaceKey] [bigint] NOT NULL,
	[UserKey] [bigint] NOT NULL,
	[Status] [tinyint] NOT NULL,
	[CreatedAt] [datetime2](3) NOT NULL,
 CONSTRAINT [PK_Memberships] PRIMARY KEY CLUSTERED 
(
	[MembershipKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Memberships] UNIQUE NONCLUSTERED 
(
	[WorkspaceKey] ASC,
	[UserKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [iam].[Permissions]    Script Date: 1/6/2026 2:49:30 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [iam].[Permissions](
	[PermissionKey] [int] IDENTITY(1,1) NOT NULL,
	[Code] [nvarchar](150) NOT NULL,
	[Resource] [nvarchar](80) NOT NULL,
	[Action] [nvarchar](80) NOT NULL,
 CONSTRAINT [PK_Permissions] PRIMARY KEY CLUSTERED 
(
	[PermissionKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Permissions_Code] UNIQUE NONCLUSTERED 
(
	[Code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [iam].[RefreshTokens]    Script Date: 1/6/2026 2:49:30 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [iam].[RefreshTokens](
	[RefreshTokenKey] [bigint] IDENTITY(1,1) NOT NULL,
	[UserKey] [bigint] NOT NULL,
	[TokenHash] [nvarchar](max) NOT NULL,
	[ExpiresAt] [datetime2](3) NOT NULL,
	[RevokedAt] [datetime2](3) NULL,
	[FamilyId] [uniqueidentifier] NULL,
	[CreatedAt] [datetime2](3) NOT NULL,
	[CreatedByIp] [nvarchar](50) NULL,
	[UserAgent] [nvarchar](500) NULL,
 CONSTRAINT [PK_RefreshTokens] PRIMARY KEY CLUSTERED 
(
	[RefreshTokenKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [iam].[Resources]    Script Date: 1/6/2026 2:49:30 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [iam].[Resources](
	[ResourceKey] [bigint] IDENTITY(1,1) NOT NULL,
	[WorkspaceKey] [bigint] NOT NULL,
	[ResourceTypeKey] [smallint] NOT NULL,
	[ExternalId] [uniqueidentifier] NOT NULL,
 CONSTRAINT [PK_Resources] PRIMARY KEY CLUSTERED 
(
	[ResourceKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Resources] UNIQUE NONCLUSTERED 
(
	[WorkspaceKey] ASC,
	[ResourceTypeKey] ASC,
	[ExternalId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [iam].[ResourceTypes]    Script Date: 1/6/2026 2:49:30 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [iam].[ResourceTypes](
	[ResourceTypeKey] [smallint] IDENTITY(1,1) NOT NULL,
	[Code] [nvarchar](50) NOT NULL,
 CONSTRAINT [PK_ResourceTypes] PRIMARY KEY CLUSTERED 
(
	[ResourceTypeKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_ResourceTypes_Code] UNIQUE NONCLUSTERED 
(
	[Code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [iam].[RolePermissionGrants]    Script Date: 1/6/2026 2:49:30 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [iam].[RolePermissionGrants](
	[GrantKey] [bigint] IDENTITY(1,1) NOT NULL,
	[RoleKey] [bigint] NOT NULL,
	[PermissionKey] [int] NOT NULL,
	[Effect] [tinyint] NOT NULL,
 CONSTRAINT [PK_RolePermissionGrants] PRIMARY KEY CLUSTERED 
(
	[GrantKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_RolePermissionGrants] UNIQUE NONCLUSTERED 
(
	[RoleKey] ASC,
	[PermissionKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [iam].[Roles]    Script Date: 1/6/2026 2:49:30 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [iam].[Roles](
	[RoleKey] [bigint] IDENTITY(1,1) NOT NULL,
	[RoleId] [uniqueidentifier] NOT NULL,
	[WorkspaceKey] [bigint] NOT NULL,
	[Name] [nvarchar](100) NOT NULL,
	[CreatedAt] [datetime2](3) NOT NULL,
 CONSTRAINT [PK_Roles] PRIMARY KEY CLUSTERED 
(
	[RoleKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Roles] UNIQUE NONCLUSTERED 
(
	[WorkspaceKey] ASC,
	[Name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [iam].[UserCredentials]    Script Date: 1/6/2026 2:49:30 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [iam].[UserCredentials](
	[UserKey] [bigint] NOT NULL,
	[PasswordHash] [nvarchar](max) NOT NULL,
	[PasswordAlgo] [nvarchar](30) NOT NULL,
	[MustChangePassword] [bit] NOT NULL,
	[CreatedAt] [datetime2](3) NOT NULL,
	[FailedLoginAttempts] [tinyint] NOT NULL,
	[LockUntil] [datetime2](3) NULL,
 CONSTRAINT [PK_UserCredentials] PRIMARY KEY CLUSTERED 
(
	[UserKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [iam].[Users]    Script Date: 1/6/2026 2:49:30 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [iam].[Users](
	[UserKey] [bigint] IDENTITY(1,1) NOT NULL,
	[UserId] [uniqueidentifier] NOT NULL,
	[Email] [nvarchar](320) NOT NULL,
	[EmailNormalized] [nvarchar](320) NOT NULL,
	[DisplayName] [nvarchar](200) NULL,
	[Status] [tinyint] NOT NULL,
	[CreatedAt] [datetime2](3) NOT NULL,
	[UpdatedAt] [datetime2](3) NOT NULL,
	[RowVer] [timestamp] NOT NULL,
	[IsSystemAdmin] [bit] NOT NULL,
 CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED 
(
	[UserKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Users_Email] UNIQUE NONCLUSTERED 
(
	[EmailNormalized] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Users_UserId] UNIQUE NONCLUSTERED 
(
	[UserId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [iam].[WidgetConversations]    Script Date: 1/6/2026 2:49:30 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [iam].[WidgetConversations](
	[ConversationKey] [bigint] IDENTITY(1,1) NOT NULL,
	[ConversationId] [uniqueidentifier] NOT NULL,
	[WidgetKey] [bigint] NOT NULL,
	[VisitorId] [nvarchar](80) NOT NULL,
	[VisitorName] [nvarchar](100) NULL,
	[Status] [tinyint] NOT NULL,
	[CreatedAt] [datetime2](3) NOT NULL,
	[UpdatedAt] [datetime2](3) NOT NULL,
	[LastMessageAt] [datetime2](3) NULL,
 CONSTRAINT [PK_WidgetConversations] PRIMARY KEY CLUSTERED 
(
	[ConversationKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_WidgetConversations_ConversationId] UNIQUE NONCLUSTERED 
(
	[ConversationId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [iam].[WidgetMessages]    Script Date: 1/6/2026 2:49:30 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [iam].[WidgetMessages](
	[MessageKey] [bigint] IDENTITY(1,1) NOT NULL,
	[MessageId] [uniqueidentifier] NOT NULL,
	[ConversationKey] [bigint] NOT NULL,
	[SenderType] [tinyint] NOT NULL,
	[Content] [nvarchar](max) NOT NULL,
	[CreatedAt] [datetime2](3) NOT NULL,
 CONSTRAINT [PK_WidgetMessages] PRIMARY KEY CLUSTERED 
(
	[MessageKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [iam].[Widgets]    Script Date: 1/6/2026 2:49:30 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [iam].[Widgets](
	[WidgetKey] [bigint] IDENTITY(1,1) NOT NULL,
	[WidgetId] [uniqueidentifier] NOT NULL,
	[WorkspaceKey] [bigint] NOT NULL,
	[Name] [nvarchar](120) NOT NULL,
	[Status] [tinyint] NOT NULL,
	[SiteKey] [nvarchar](64) NULL,
	[AllowedDomains] [nvarchar](max) NOT NULL,
	[Theme] [nvarchar](max) NOT NULL,
	[CreatedAt] [datetime2](3) NOT NULL,
	[UpdatedAt] [datetime2](3) NOT NULL,
 CONSTRAINT [PK_Widgets] PRIMARY KEY CLUSTERED 
(
	[WidgetKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Widgets_WidgetId] UNIQUE NONCLUSTERED 
(
	[WidgetId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [iam].[Workspaces]    Script Date: 1/6/2026 2:49:30 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [iam].[Workspaces](
	[WorkspaceKey] [bigint] IDENTITY(1,1) NOT NULL,
	[WorkspaceId] [uniqueidentifier] NOT NULL,
	[Name] [nvarchar](255) NOT NULL,
	[Status] [tinyint] NOT NULL,
	[CreatedAt] [datetime2](3) NOT NULL,
 CONSTRAINT [PK_Workspaces] PRIMARY KEY CLUSTERED 
(
	[WorkspaceKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Workspaces_WorkspaceId] UNIQUE NONCLUSTERED 
(
	[WorkspaceId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [iam].[Memberships] ADD  DEFAULT (newsequentialid()) FOR [MembershipId]
GO
ALTER TABLE [iam].[Memberships] ADD  DEFAULT ((1)) FOR [Status]
GO
ALTER TABLE [iam].[Memberships] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [iam].[RefreshTokens] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [iam].[Roles] ADD  DEFAULT (newsequentialid()) FOR [RoleId]
GO
ALTER TABLE [iam].[Roles] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [iam].[UserCredentials] ADD  DEFAULT ((0)) FOR [MustChangePassword]
GO
ALTER TABLE [iam].[UserCredentials] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [iam].[UserCredentials] ADD  DEFAULT ((0)) FOR [FailedLoginAttempts]
GO
ALTER TABLE [iam].[Users] ADD  DEFAULT (newsequentialid()) FOR [UserId]
GO
ALTER TABLE [iam].[Users] ADD  DEFAULT ((1)) FOR [Status]
GO
ALTER TABLE [iam].[Users] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [iam].[Users] ADD  DEFAULT (sysutcdatetime()) FOR [UpdatedAt]
GO
ALTER TABLE [iam].[Users] ADD  DEFAULT ((0)) FOR [IsSystemAdmin]
GO
ALTER TABLE [iam].[WidgetConversations] ADD  DEFAULT (newsequentialid()) FOR [ConversationId]
GO
ALTER TABLE [iam].[WidgetConversations] ADD  DEFAULT ((1)) FOR [Status]
GO
ALTER TABLE [iam].[WidgetConversations] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [iam].[WidgetConversations] ADD  DEFAULT (sysutcdatetime()) FOR [UpdatedAt]
GO
ALTER TABLE [iam].[WidgetMessages] ADD  DEFAULT (newsequentialid()) FOR [MessageId]
GO
ALTER TABLE [iam].[WidgetMessages] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [iam].[Widgets] ADD  DEFAULT (newsequentialid()) FOR [WidgetId]
GO
ALTER TABLE [iam].[Widgets] ADD  DEFAULT ((1)) FOR [Status]
GO
ALTER TABLE [iam].[Widgets] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [iam].[Widgets] ADD  DEFAULT (sysutcdatetime()) FOR [UpdatedAt]
GO
ALTER TABLE [iam].[Workspaces] ADD  DEFAULT (newsequentialid()) FOR [WorkspaceId]
GO
ALTER TABLE [iam].[Workspaces] ADD  DEFAULT ((1)) FOR [Status]
GO
ALTER TABLE [iam].[Workspaces] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [iam].[GrantScopes]  WITH CHECK ADD  CONSTRAINT [FK_GrantScopes_Grant] FOREIGN KEY([GrantKey])
REFERENCES [iam].[RolePermissionGrants] ([GrantKey])
ON DELETE CASCADE
GO
ALTER TABLE [iam].[GrantScopes] CHECK CONSTRAINT [FK_GrantScopes_Grant]
GO
ALTER TABLE [iam].[GrantScopes]  WITH CHECK ADD  CONSTRAINT [FK_GrantScopes_Resource] FOREIGN KEY([ResourceKey])
REFERENCES [iam].[Resources] ([ResourceKey])
GO
ALTER TABLE [iam].[GrantScopes] CHECK CONSTRAINT [FK_GrantScopes_Resource]
GO
ALTER TABLE [iam].[MembershipEffectivePermissions]  WITH CHECK ADD  CONSTRAINT [FK_MEP_Membership] FOREIGN KEY([MembershipKey])
REFERENCES [iam].[Memberships] ([MembershipKey])
ON DELETE CASCADE
GO
ALTER TABLE [iam].[MembershipEffectivePermissions] CHECK CONSTRAINT [FK_MEP_Membership]
GO
ALTER TABLE [iam].[MembershipEffectivePermissions]  WITH CHECK ADD  CONSTRAINT [FK_MEP_Permission] FOREIGN KEY([PermissionKey])
REFERENCES [iam].[Permissions] ([PermissionKey])
GO
ALTER TABLE [iam].[MembershipEffectivePermissions] CHECK CONSTRAINT [FK_MEP_Permission]
GO
ALTER TABLE [iam].[MembershipEffectivePermissions]  WITH CHECK ADD  CONSTRAINT [FK_MEP_Resource] FOREIGN KEY([ResourceKey])
REFERENCES [iam].[Resources] ([ResourceKey])
GO
ALTER TABLE [iam].[MembershipEffectivePermissions] CHECK CONSTRAINT [FK_MEP_Resource]
GO
ALTER TABLE [iam].[MembershipPermissionOverrides]  WITH CHECK ADD  CONSTRAINT [FK_MO_Membership] FOREIGN KEY([MembershipKey])
REFERENCES [iam].[Memberships] ([MembershipKey])
ON DELETE CASCADE
GO
ALTER TABLE [iam].[MembershipPermissionOverrides] CHECK CONSTRAINT [FK_MO_Membership]
GO
ALTER TABLE [iam].[MembershipPermissionOverrides]  WITH CHECK ADD  CONSTRAINT [FK_MO_Permission] FOREIGN KEY([PermissionKey])
REFERENCES [iam].[Permissions] ([PermissionKey])
GO
ALTER TABLE [iam].[MembershipPermissionOverrides] CHECK CONSTRAINT [FK_MO_Permission]
GO
ALTER TABLE [iam].[MembershipPermissionOverrides]  WITH CHECK ADD  CONSTRAINT [FK_MO_Resource] FOREIGN KEY([ResourceKey])
REFERENCES [iam].[Resources] ([ResourceKey])
GO
ALTER TABLE [iam].[MembershipPermissionOverrides] CHECK CONSTRAINT [FK_MO_Resource]
GO
ALTER TABLE [iam].[MembershipRoles]  WITH CHECK ADD  CONSTRAINT [FK_MembershipRoles_Membership] FOREIGN KEY([MembershipKey])
REFERENCES [iam].[Memberships] ([MembershipKey])
ON DELETE CASCADE
GO
ALTER TABLE [iam].[MembershipRoles] CHECK CONSTRAINT [FK_MembershipRoles_Membership]
GO
ALTER TABLE [iam].[MembershipRoles]  WITH CHECK ADD  CONSTRAINT [FK_MembershipRoles_Role] FOREIGN KEY([RoleKey])
REFERENCES [iam].[Roles] ([RoleKey])
GO
ALTER TABLE [iam].[MembershipRoles] CHECK CONSTRAINT [FK_MembershipRoles_Role]
GO
ALTER TABLE [iam].[Memberships]  WITH CHECK ADD  CONSTRAINT [FK_Memberships_User] FOREIGN KEY([UserKey])
REFERENCES [iam].[Users] ([UserKey])
GO
ALTER TABLE [iam].[Memberships] CHECK CONSTRAINT [FK_Memberships_User]
GO
ALTER TABLE [iam].[Memberships]  WITH CHECK ADD  CONSTRAINT [FK_Memberships_Workspace] FOREIGN KEY([WorkspaceKey])
REFERENCES [iam].[Workspaces] ([WorkspaceKey])
GO
ALTER TABLE [iam].[Memberships] CHECK CONSTRAINT [FK_Memberships_Workspace]
GO
ALTER TABLE [iam].[RefreshTokens]  WITH CHECK ADD  CONSTRAINT [FK_RefreshTokens_User] FOREIGN KEY([UserKey])
REFERENCES [iam].[Users] ([UserKey])
ON DELETE CASCADE
GO
ALTER TABLE [iam].[RefreshTokens] CHECK CONSTRAINT [FK_RefreshTokens_User]
GO
ALTER TABLE [iam].[Resources]  WITH CHECK ADD  CONSTRAINT [FK_Resources_Type] FOREIGN KEY([ResourceTypeKey])
REFERENCES [iam].[ResourceTypes] ([ResourceTypeKey])
GO
ALTER TABLE [iam].[Resources] CHECK CONSTRAINT [FK_Resources_Type]
GO
ALTER TABLE [iam].[Resources]  WITH CHECK ADD  CONSTRAINT [FK_Resources_Workspace] FOREIGN KEY([WorkspaceKey])
REFERENCES [iam].[Workspaces] ([WorkspaceKey])
GO
ALTER TABLE [iam].[Resources] CHECK CONSTRAINT [FK_Resources_Workspace]
GO
ALTER TABLE [iam].[RolePermissionGrants]  WITH CHECK ADD  CONSTRAINT [FK_RPG_Permission] FOREIGN KEY([PermissionKey])
REFERENCES [iam].[Permissions] ([PermissionKey])
GO
ALTER TABLE [iam].[RolePermissionGrants] CHECK CONSTRAINT [FK_RPG_Permission]
GO
ALTER TABLE [iam].[RolePermissionGrants]  WITH CHECK ADD  CONSTRAINT [FK_RPG_Role] FOREIGN KEY([RoleKey])
REFERENCES [iam].[Roles] ([RoleKey])
GO
ALTER TABLE [iam].[RolePermissionGrants] CHECK CONSTRAINT [FK_RPG_Role]
GO
ALTER TABLE [iam].[Roles]  WITH CHECK ADD  CONSTRAINT [FK_Roles_Workspace] FOREIGN KEY([WorkspaceKey])
REFERENCES [iam].[Workspaces] ([WorkspaceKey])
GO
ALTER TABLE [iam].[Roles] CHECK CONSTRAINT [FK_Roles_Workspace]
GO
ALTER TABLE [iam].[UserCredentials]  WITH CHECK ADD  CONSTRAINT [FK_UserCredentials_User] FOREIGN KEY([UserKey])
REFERENCES [iam].[Users] ([UserKey])
ON DELETE CASCADE
GO
ALTER TABLE [iam].[UserCredentials] CHECK CONSTRAINT [FK_UserCredentials_User]
GO
ALTER TABLE [iam].[WidgetConversations]  WITH CHECK ADD  CONSTRAINT [FK_WidgetConversations_Widget] FOREIGN KEY([WidgetKey])
REFERENCES [iam].[Widgets] ([WidgetKey])
GO
ALTER TABLE [iam].[WidgetConversations] CHECK CONSTRAINT [FK_WidgetConversations_Widget]
GO
ALTER TABLE [iam].[WidgetMessages]  WITH CHECK ADD  CONSTRAINT [FK_WidgetMessages_Conversation] FOREIGN KEY([ConversationKey])
REFERENCES [iam].[WidgetConversations] ([ConversationKey])
GO
ALTER TABLE [iam].[WidgetMessages] CHECK CONSTRAINT [FK_WidgetMessages_Conversation]
GO
ALTER TABLE [iam].[Widgets]  WITH CHECK ADD  CONSTRAINT [FK_Widgets_Workspace] FOREIGN KEY([WorkspaceKey])
REFERENCES [iam].[Workspaces] ([WorkspaceKey])
GO
ALTER TABLE [iam].[Widgets] CHECK CONSTRAINT [FK_Widgets_Workspace]
GO
ALTER TABLE [iam].[MembershipPermissionOverrides]  WITH CHECK ADD  CONSTRAINT [CK_MO_Effect] CHECK  (([Effect]=(2) OR [Effect]=(1)))
GO
ALTER TABLE [iam].[MembershipPermissionOverrides] CHECK CONSTRAINT [CK_MO_Effect]
GO
ALTER TABLE [iam].[RolePermissionGrants]  WITH CHECK ADD  CONSTRAINT [CK_RPG_Effect] CHECK  (([Effect]=(2) OR [Effect]=(1)))
GO
ALTER TABLE [iam].[RolePermissionGrants] CHECK CONSTRAINT [CK_RPG_Effect]
GO
ALTER TABLE [iam].[Users]  WITH CHECK ADD  CONSTRAINT [CK_Users_Status] CHECK  (([Status]=(3) OR [Status]=(2) OR [Status]=(1)))
GO
ALTER TABLE [iam].[Users] CHECK CONSTRAINT [CK_Users_Status]
GO
ALTER TABLE [iam].[Workspaces]  WITH CHECK ADD  CONSTRAINT [CK_Workspaces_Status] CHECK  (([Status]=(2) OR [Status]=(1)))
GO
ALTER TABLE [iam].[Workspaces] CHECK CONSTRAINT [CK_Workspaces_Status]
GO
/****** Object:  StoredProcedure [iam].[RebuildMembershipEffectivePermissions]    Script Date: 1/6/2026 2:49:30 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

------------------------------------------------------------
-- 14) STORED PROCEDURE: REBUILD EFFECTIVE PERMISSIONS
------------------------------------------------------------
CREATE   PROCEDURE [iam].[RebuildMembershipEffectivePermissions]
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
