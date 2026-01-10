/**
 * Idempotent Migration: Unread Counts Feature
 * 
 * Safe to run multiple times. Creates necessary columns and tables
 * for tracking conversation unread counts per user.
 */

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '=== Unread Counts Migration ===';
PRINT '';

------------------------------------------------------------
-- 1) Add VisitorMessageCount column if not exists
------------------------------------------------------------
IF COL_LENGTH('iam.WidgetConversations', 'VisitorMessageCount') IS NULL
BEGIN
    ALTER TABLE iam.WidgetConversations 
    ADD VisitorMessageCount INT NOT NULL DEFAULT 0;
    PRINT 'Added column: iam.WidgetConversations.VisitorMessageCount';
END
ELSE
BEGIN
    PRINT 'Column already exists: iam.WidgetConversations.VisitorMessageCount';
END
GO

------------------------------------------------------------
-- 2) Create WidgetConversationReads table if not exists
------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.tables 
    WHERE name = 'WidgetConversationReads' 
    AND schema_id = SCHEMA_ID('iam')
)
BEGIN
    CREATE TABLE iam.WidgetConversationReads (
        ReadKey BIGINT IDENTITY(1,1) NOT NULL,
        ConversationKey BIGINT NOT NULL,
        UserKey BIGINT NOT NULL,
        LastReadVisitorCount INT NOT NULL 
            CONSTRAINT DF_WidgetConversationReads_LastReadVisitorCount DEFAULT 0,
        LastReadAt DATETIME2(7) NOT NULL 
            CONSTRAINT DF_WidgetConversationReads_LastReadAt DEFAULT SYSUTCDATETIME(),
        
        CONSTRAINT PK_WidgetConversationReads 
            PRIMARY KEY CLUSTERED (ReadKey ASC),
        CONSTRAINT UK_WidgetConversationReads_Conversation_User 
            UNIQUE NONCLUSTERED (ConversationKey ASC, UserKey ASC)
    );
    PRINT 'Created table: iam.WidgetConversationReads';
END
ELSE
BEGIN
    PRINT 'Table already exists: iam.WidgetConversationReads';
END
GO

------------------------------------------------------------
-- 3) Create index for efficient unread count queries
------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_WidgetConversationReads_UserKey' 
    AND object_id = OBJECT_ID('iam.WidgetConversationReads')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_WidgetConversationReads_UserKey
    ON iam.WidgetConversationReads (UserKey ASC)
    INCLUDE (ConversationKey, LastReadVisitorCount);
    PRINT 'Created index: IX_WidgetConversationReads_UserKey';
END
ELSE
BEGIN
    PRINT 'Index already exists: IX_WidgetConversationReads_UserKey';
END
GO

PRINT '';
PRINT '=== Migration completed successfully ===';
GO
