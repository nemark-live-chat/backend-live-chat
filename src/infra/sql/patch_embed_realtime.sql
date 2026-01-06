/*
   FILE: patch_embed_realtime.sql
   PURPOSE: Add SiteKey column and indexes for embed widget realtime chat
   RUN: Execute this script in SQL Server Management Studio or via sqlcmd
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

------------------------------------------------------------
-- 1) Add SiteKey column to Widgets if not exists
------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('iam.Widgets') AND name = 'SiteKey')
BEGIN
    ALTER TABLE iam.Widgets ADD SiteKey NVARCHAR(64) NULL;
    PRINT 'Added SiteKey column to iam.Widgets';
END
GO

------------------------------------------------------------
-- 2) Create unique index on SiteKey
------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Widgets_SiteKey' AND object_id = OBJECT_ID('iam.Widgets'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX IX_Widgets_SiteKey 
    ON iam.Widgets(SiteKey) 
    WHERE SiteKey IS NOT NULL;
    PRINT 'Created unique index IX_Widgets_SiteKey';
END
GO

------------------------------------------------------------
-- 3) Generate SiteKey for existing widgets that don't have one
------------------------------------------------------------
UPDATE iam.Widgets 
SET SiteKey = LOWER(REPLACE(CONVERT(NVARCHAR(36), WidgetId), '-', ''))
WHERE SiteKey IS NULL;
PRINT 'Updated existing widgets with generated SiteKey';
GO

------------------------------------------------------------
-- 4) Add VisitorName column to WidgetConversations if not exists
------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('iam.WidgetConversations') AND name = 'VisitorName')
BEGIN
    ALTER TABLE iam.WidgetConversations ADD VisitorName NVARCHAR(100) NULL;
    PRINT 'Added VisitorName column to iam.WidgetConversations';
END
GO

------------------------------------------------------------
-- 5) Add LastMessageAt for efficient sorting
------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('iam.WidgetConversations') AND name = 'LastMessageAt')
BEGIN
    ALTER TABLE iam.WidgetConversations ADD LastMessageAt DATETIME2(3) NULL;
    PRINT 'Added LastMessageAt column to iam.WidgetConversations';
END
GO

------------------------------------------------------------
-- 6) Create index for active conversations listing
------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WidgetConversations_Active' AND object_id = OBJECT_ID('iam.WidgetConversations'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_WidgetConversations_Active
    ON iam.WidgetConversations(WidgetKey, Status, LastMessageAt DESC)
    INCLUDE (VisitorId, VisitorName);
    PRINT 'Created index IX_WidgetConversations_Active';
END
GO

PRINT 'Patch completed successfully!';
GO
