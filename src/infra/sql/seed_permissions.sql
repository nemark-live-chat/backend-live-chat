/*
   FILE: seed_permissions.sql
   PURPOSE: Seed initial permissions for workspace/IAM system
   RUN: Execute in SQL Server Management Studio or via sqlcmd
   
   NOTE: Run this BEFORE using the workspace creation API.
   Missing permissions will cause 500 errors.
*/

SET NOCOUNT ON;

-- Insert permissions (ignore duplicates)
MERGE INTO iam.Permissions AS target
USING (VALUES
    -- Workspace management
    ('workspace.manage', 'workspace', 'manage'),
    
    -- Member management
    ('member.invite', 'member', 'invite'),
    ('member.read', 'member', 'read'),
    ('member.remove', 'member', 'remove'),
    
    -- Role & permission management
    ('role.manage', 'role', 'manage'),
    ('role.read', 'role', 'read'),
    ('permission.read', 'permission', 'read'),
    
    -- Widget management
    ('widget.manage', 'widget', 'manage'),
    ('widget.read', 'widget', 'read'),
    
    -- Conversation management
    ('conversation.read', 'conversation', 'read'),
    ('conversation.reply', 'conversation', 'reply'),
    ('conversation.assign', 'conversation', 'assign'),
    ('conversation.close', 'conversation', 'close'),
    ('conversation.note', 'conversation', 'note'),
    ('conversation.tag', 'conversation', 'tag'),
    
    -- Contact management
    ('contact.read', 'contact', 'read'),
    ('contact.create', 'contact', 'create'),
    ('contact.update', 'contact', 'update'),
    ('contact.merge', 'contact', 'merge'),
    
    -- Reporting
    ('report.view', 'report', 'view'),
    ('report.export', 'report', 'export'),
    
    -- Audit
    ('audit.read', 'audit', 'read'),
    
    -- Integrations
    ('integration.manage', 'integration', 'manage'),
    
    -- Billing
    ('billing.view', 'billing', 'view'),
    ('billing.manage', 'billing', 'manage')
) AS source (Code, Resource, Action)
ON target.Code = source.Code
WHEN NOT MATCHED THEN
    INSERT (Code, Resource, Action)
    VALUES (source.Code, source.Resource, source.Action);

PRINT 'Permissions seeded successfully.';

-- Display current permissions
SELECT PermissionKey, Code, Resource, Action FROM iam.Permissions ORDER BY Code;
GO
