/*
   FILE: seed_default_roles.sql
   PURPOSE: Seed default roles (Agent, Manager) for new workspaces
   RUN: Execute in SQL Server Management Studio 
   
   NOTE: Run this after seed_permissions.sql
*/

SET NOCOUNT ON;

-- Permissions for common roles
DECLARE @AgentPermissions TABLE (Code NVARCHAR(150));
INSERT INTO @AgentPermissions VALUES
    ('conversation.read'),
    ('conversation.reply'),
    ('conversation.note'),
    ('conversation.tag'),
    ('contact.read');

DECLARE @ManagerPermissions TABLE (Code NVARCHAR(150));
INSERT INTO @ManagerPermissions VALUES
    ('conversation.read'),
    ('conversation.reply'),
    ('conversation.assign'),
    ('conversation.close'),
    ('conversation.note'),
    ('conversation.tag'),
    ('contact.read'),
    ('contact.create'),
    ('contact.update'),
    ('member.read'),
    ('report.view'),
    ('widget.read');

PRINT 'Default role permissions defined.';
PRINT 'Note: Roles are created per-workspace when needed.';
PRINT 'Use the API to invite members with existing roles.';
GO
