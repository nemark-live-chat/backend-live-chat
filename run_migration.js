/**
 * Run SQL migrations for embed widget
 * Creates all required tables and columns
 */
const { connectSql, getPool, sql } = require('./src/infra/sql/pool');

async function runMigration() {
    try {
        console.log('Connecting to database...');
        await connectSql();
        const pool = getPool();

        console.log('Running migrations...\n');

        // 1. Create Widgets table if not exists
        console.log('1. Checking iam.Widgets table...');
        await pool.request().query(`
      IF OBJECT_ID('iam.Widgets', 'U') IS NULL
      CREATE TABLE iam.Widgets (
          WidgetKey BIGINT IDENTITY(1,1) NOT NULL,
          WidgetId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
          
          WorkspaceKey BIGINT NOT NULL,
          Name NVARCHAR(120) NOT NULL,
          Status TINYINT NOT NULL DEFAULT 1,
          SiteKey NVARCHAR(64) NULL,
          
          AllowedDomains NVARCHAR(MAX) NOT NULL,
          Theme NVARCHAR(MAX) NOT NULL,
          
          CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
          UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
          
          CONSTRAINT PK_Widgets PRIMARY KEY CLUSTERED (WidgetKey),
          CONSTRAINT UQ_Widgets_WidgetId UNIQUE (WidgetId),
          CONSTRAINT FK_Widgets_Workspace 
              FOREIGN KEY (WorkspaceKey) REFERENCES iam.Workspaces(WorkspaceKey)
      )
    `);
        console.log('   ✓ iam.Widgets table ready');

        // 2. Create WidgetConversations table if not exists
        console.log('2. Checking iam.WidgetConversations table...');
        await pool.request().query(`
      IF OBJECT_ID('iam.WidgetConversations', 'U') IS NULL
      CREATE TABLE iam.WidgetConversations (
          ConversationKey BIGINT IDENTITY(1,1) NOT NULL,
          ConversationId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
          
          WidgetKey BIGINT NOT NULL,
          VisitorId NVARCHAR(80) NOT NULL,
          VisitorName NVARCHAR(100) NULL,
          Status TINYINT NOT NULL DEFAULT 1,
          
          CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
          UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
          LastMessageAt DATETIME2(3) NULL,
          
          CONSTRAINT PK_WidgetConversations PRIMARY KEY CLUSTERED (ConversationKey),
          CONSTRAINT UQ_WidgetConversations_ConversationId UNIQUE (ConversationId),
          CONSTRAINT FK_WidgetConversations_Widget
              FOREIGN KEY (WidgetKey) REFERENCES iam.Widgets(WidgetKey)
      )
    `);
        console.log('   ✓ iam.WidgetConversations table ready');

        // 3. Create WidgetMessages table if not exists
        console.log('3. Checking iam.WidgetMessages table...');
        await pool.request().query(`
      IF OBJECT_ID('iam.WidgetMessages', 'U') IS NULL
      CREATE TABLE iam.WidgetMessages (
          MessageKey BIGINT IDENTITY(1,1) NOT NULL,
          MessageId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
          
          ConversationKey BIGINT NOT NULL,
          SenderType TINYINT NOT NULL,
          Content NVARCHAR(MAX) NOT NULL,
          
          CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
          
          CONSTRAINT PK_WidgetMessages PRIMARY KEY CLUSTERED (MessageKey),
          CONSTRAINT FK_WidgetMessages_Conversation
              FOREIGN KEY (ConversationKey) REFERENCES iam.WidgetConversations(ConversationKey)
      )
    `);
        console.log('   ✓ iam.WidgetMessages table ready');

        // 4. Add SiteKey column if missing (for existing tables)
        console.log('4. Checking SiteKey column...');
        try {
            await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('iam.Widgets') AND name = 'SiteKey')
        ALTER TABLE iam.Widgets ADD SiteKey NVARCHAR(64) NULL
      `);
            console.log('   ✓ SiteKey column exists');
        } catch (e) {
            console.log('   SiteKey already exists');
        }

        // 5. Generate SiteKey for existing widgets
        console.log('5. Generating SiteKeys for widgets without one...');
        const result = await pool.request().query(`
      UPDATE iam.Widgets 
      SET SiteKey = LOWER(REPLACE(CONVERT(NVARCHAR(36), WidgetId), '-', '')) 
      WHERE SiteKey IS NULL
    `);
        console.log(`   ✓ Updated ${result.rowsAffected[0]} widgets`);

        // 6. Create indexes
        console.log('6. Creating indexes...');
        try {
            await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Widgets_SiteKey')
        CREATE UNIQUE NONCLUSTERED INDEX IX_Widgets_SiteKey ON iam.Widgets(SiteKey) WHERE SiteKey IS NOT NULL
      `);
            await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WidgetConversations_Lookup')
        CREATE INDEX IX_WidgetConversations_Lookup ON iam.WidgetConversations(WidgetKey, VisitorId, Status)
      `);
            await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WidgetMessages_Conversation')
        CREATE INDEX IX_WidgetMessages_Conversation ON iam.WidgetMessages(ConversationKey, CreatedAt)
      `);
            console.log('   ✓ Indexes created');
        } catch (e) {
            console.log('   Indexes may already exist');
        }

        // 7. Add LastMessageSeq columns for chat realtime optimization
        console.log('7. Adding LastMessageSeq columns to WidgetConversations...');
        try {
            // Add LastMessageSeq column
            await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('iam.WidgetConversations') AND name = 'LastMessageSeq')
        ALTER TABLE iam.WidgetConversations ADD LastMessageSeq BIGINT NULL
      `);
            // Add LastMessagePreview column
            await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('iam.WidgetConversations') AND name = 'LastMessagePreview')
        ALTER TABLE iam.WidgetConversations ADD LastMessagePreview NVARCHAR(200) NULL
      `);
            // Add LastMessageMongoId column
            await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('iam.WidgetConversations') AND name = 'LastMessageMongoId')
        ALTER TABLE iam.WidgetConversations ADD LastMessageMongoId NVARCHAR(24) NULL
      `);
            console.log('   ✓ LastMessage columns added');
        } catch (e) {
            console.log('   LastMessage columns may already exist:', e.message);
        }

        // 8. Create inbox listing index for fast conversation list
        console.log('8. Creating inbox listing index...');
        try {
            await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WidgetConversations_Widget_LastMessageAt')
        CREATE NONCLUSTERED INDEX IX_WidgetConversations_Widget_LastMessageAt
        ON iam.WidgetConversations (WidgetKey, Status, LastMessageAt DESC)
        INCLUDE (ConversationKey, ConversationId, VisitorId, VisitorName, UpdatedAt, LastMessageSeq, LastMessagePreview)
      `);
            console.log('   ✓ Inbox listing index created');
        } catch (e) {
            console.log('   Inbox index may already exist:', e.message);
        }

        // 9. Check if we need to create a test widget
        console.log('9. Checking for existing widgets...');
        const widgetCheck = await pool.request().query(`SELECT COUNT(*) as count FROM iam.Widgets`);

        if (widgetCheck.recordset[0].count === 0) {
            console.log('   No widgets found, creating test widget...');

            // Get or create workspace
            let wsResult = await pool.request().query(`SELECT TOP 1 WorkspaceKey FROM iam.Workspaces`);

            if (wsResult.recordset.length === 0) {
                await pool.request().query(`INSERT INTO iam.Workspaces (Name, Status) VALUES ('Test Workspace', 1)`);
                wsResult = await pool.request().query(`SELECT TOP 1 WorkspaceKey FROM iam.Workspaces`);
                console.log('   Created test workspace');
            }

            const workspaceKey = wsResult.recordset[0].WorkspaceKey;
            const testSiteKey = 'test' + Date.now().toString(36);

            await pool.request()
                .input('workspaceKey', sql.BigInt, workspaceKey)
                .input('name', sql.NVarChar, 'Test Widget')
                .input('siteKey', sql.NVarChar, testSiteKey)
                .input('allowedDomains', sql.NVarChar, JSON.stringify(['http://localhost:3001', 'http://localhost:3000', '*']))
                .input('theme', sql.NVarChar, JSON.stringify({ color: '#2563eb', title: 'Chat Support' }))
                .query(`
          INSERT INTO iam.Widgets (WorkspaceKey, Name, Status, AllowedDomains, Theme, SiteKey)
          VALUES (@workspaceKey, @name, 1, @allowedDomains, @theme, @siteKey)
        `);

            console.log(`   ✓ Created test widget`);
            console.log(`\n   📝 SiteKey: ${testSiteKey}`);
            console.log(`   📌 Use this in demo: http://localhost:3001/api/embed/demo?siteKey=${testSiteKey}`);
        } else {
            const widgets = await pool.request().query(`SELECT Name, SiteKey FROM iam.Widgets WHERE Status = 1`);
            console.log('   Existing widgets:');
            widgets.recordset.forEach(w => {
                console.log(`   - ${w.Name}: SiteKey = ${w.SiteKey}`);
            });
            if (widgets.recordset.length > 0) {
                console.log(`\n   📌 Demo URL: http://localhost:3001/api/embed/demo?siteKey=${widgets.recordset[0].SiteKey}`);
            }
        }

        console.log('\n✅ Migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
