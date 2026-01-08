/*
   FILE: patch_workspace_invites.sql
   PURPOSE: Add WorkspaceInvites table for member invitation system
   RUN: Execute in SQL Server Management Studio or via sqlcmd
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

------------------------------------------------------------
-- 1) Create WorkspaceInvites Table if not exists
------------------------------------------------------------
IF OBJECT_ID('iam.WorkspaceInvites', 'U') IS NULL
BEGIN
    CREATE TABLE iam.WorkspaceInvites (
        InviteKey BIGINT IDENTITY(1,1) NOT NULL,
        InviteId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        
        WorkspaceKey BIGINT NOT NULL,
        Email NVARCHAR(320) NOT NULL,
        RoleName NVARCHAR(100) NOT NULL,
        
        InvitedByMembershipKey BIGINT NOT NULL,
        TokenHash NVARCHAR(64) NOT NULL,
        
        Status TINYINT NOT NULL DEFAULT 1, -- 1=Pending, 2=Accepted, 3=Expired, 4=Revoked
        
        ExpiresAt DATETIME2(3) NOT NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NULL,
        
        CONSTRAINT PK_WorkspaceInvites PRIMARY KEY CLUSTERED (InviteKey),
        CONSTRAINT UQ_WorkspaceInvites_InviteId UNIQUE (InviteId),
        CONSTRAINT UQ_WorkspaceInvites_TokenHash UNIQUE (TokenHash),
        
        CONSTRAINT FK_WorkspaceInvites_Workspace
            FOREIGN KEY (WorkspaceKey) REFERENCES iam.Workspaces(WorkspaceKey),
        CONSTRAINT FK_WorkspaceInvites_InvitedBy
            FOREIGN KEY (InvitedByMembershipKey) REFERENCES iam.Memberships(MembershipKey),
            
        CONSTRAINT CK_WorkspaceInvites_Status CHECK (Status IN (1,2,3,4))
    );
    
    PRINT 'Created iam.WorkspaceInvites table';
END
ELSE
BEGIN
    PRINT 'iam.WorkspaceInvites already exists';
END
GO

------------------------------------------------------------
-- 2) Create indexes for common queries
------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WorkspaceInvites_Workspace_Status' AND object_id = OBJECT_ID('iam.WorkspaceInvites'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_WorkspaceInvites_Workspace_Status
    ON iam.WorkspaceInvites(WorkspaceKey, Status, ExpiresAt)
    INCLUDE (Email, RoleName);
    PRINT 'Created index IX_WorkspaceInvites_Workspace_Status';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WorkspaceInvites_Email' AND object_id = OBJECT_ID('iam.WorkspaceInvites'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_WorkspaceInvites_Email
    ON iam.WorkspaceInvites(Email, Status)
    INCLUDE (WorkspaceKey, RoleName, ExpiresAt);
    PRINT 'Created index IX_WorkspaceInvites_Email';
END
GO

PRINT 'Patch completed successfully!';
GO
