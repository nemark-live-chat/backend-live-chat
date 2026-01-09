/**
 * Auto-seed permissions on startup if not present
 * This ensures the application works even without manual SQL execution
 */

const { getPool, sql } = require('./pool');

const REQUIRED_PERMISSIONS = [
    // Workspace management
    { code: 'workspace.manage', resource: 'workspace', action: 'manage' },
    // Member management
    { code: 'member.invite', resource: 'member', action: 'invite' },
    { code: 'member.read', resource: 'member', action: 'read' },
    { code: 'member.remove', resource: 'member', action: 'remove' },
    // Role & permission management
    { code: 'role.manage', resource: 'role', action: 'manage' },
    { code: 'role.read', resource: 'role', action: 'read' },
    { code: 'permission.read', resource: 'permission', action: 'read' },
    // Widget management
    { code: 'widget.manage', resource: 'widget', action: 'manage' },
    { code: 'widget.read', resource: 'widget', action: 'read' },
    // Conversation management
    { code: 'conversation.read', resource: 'conversation', action: 'read' },
    { code: 'conversation.reply', resource: 'conversation', action: 'reply' },
    { code: 'conversation.assign', resource: 'conversation', action: 'assign' },
    { code: 'conversation.close', resource: 'conversation', action: 'close' },
    { code: 'conversation.note', resource: 'conversation', action: 'note' },
    { code: 'conversation.tag', resource: 'conversation', action: 'tag' },
    // Contact management
    { code: 'contact.read', resource: 'contact', action: 'read' },
    { code: 'contact.create', resource: 'contact', action: 'create' },
    { code: 'contact.update', resource: 'contact', action: 'update' },
    { code: 'contact.merge', resource: 'contact', action: 'merge' },
    // Reporting
    { code: 'report.view', resource: 'report', action: 'view' },
    { code: 'report.export', resource: 'report', action: 'export' },
    // Audit
    { code: 'audit.read', resource: 'audit', action: 'read' },
    // Integrations
    { code: 'integration.manage', resource: 'integration', action: 'manage' },
    // Billing
    { code: 'billing.view', resource: 'billing', action: 'view' },
    { code: 'billing.manage', resource: 'billing', action: 'manage' },
];

/**
 * Seed permissions if not present
 */
async function seedPermissionsIfNeeded() {
    try {
        const pool = getPool();

        // Check if any permissions exist
        const countResult = await pool.request().query('SELECT COUNT(*) as cnt FROM iam.Permissions');
        const existingCount = countResult.recordset[0].cnt;

        if (existingCount >= REQUIRED_PERMISSIONS.length) {
            console.log(`[Auto-seed] Permissions already seeded (${existingCount} found)`);
            return;
        }

        console.log(`[Auto-seed] Found ${existingCount} permissions, seeding ${REQUIRED_PERMISSIONS.length}...`);

        // Seed missing permissions using MERGE
        for (const perm of REQUIRED_PERMISSIONS) {
            await pool.request()
                .input('code', sql.NVarChar(150), perm.code)
                .input('resource', sql.NVarChar(100), perm.resource)
                .input('action', sql.NVarChar(50), perm.action)
                .query(`
          IF NOT EXISTS (SELECT 1 FROM iam.Permissions WHERE Code = @code)
          INSERT INTO iam.Permissions (Code, Resource, Action) VALUES (@code, @resource, @action)
        `);
        }

        console.log(`[Auto-seed] Permissions seeded successfully`);
    } catch (err) {
        console.error('[Auto-seed] Failed to seed permissions:', err.message);
        // Don't throw - let app continue, user can run SQL manually
    }
}

/**
 * Check and add SiteKey column to Widgets table if missing
 */
async function ensureWidgetSiteKeyColumn() {
    try {
        const pool = getPool();

        // Check if column exists
        const result = await pool.request().query(`
      SELECT 1 FROM sys.columns 
      WHERE object_id = OBJECT_ID('iam.Widgets') AND name = 'SiteKey'
    `);

        if (result.recordset.length > 0) {
            console.log('[Auto-seed] SiteKey column already exists');
            return;
        }

        console.log('[Auto-seed] Adding SiteKey column to iam.Widgets...');

        // Add column
        await pool.request().query(`
      ALTER TABLE iam.Widgets ADD SiteKey NVARCHAR(24) NULL
    `);

        // Update existing rows
        await pool.request().query(`
      UPDATE iam.Widgets 
      SET SiteKey = LOWER(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', ''))
      WHERE SiteKey IS NULL
    `);

        // Make NOT NULL
        await pool.request().query(`
      ALTER TABLE iam.Widgets ALTER COLUMN SiteKey NVARCHAR(24) NOT NULL
    `);

        console.log('[Auto-seed] SiteKey column added successfully');
    } catch (err) {
        console.error('[Auto-seed] SiteKey migration error:', err.message);
    }
}

/**
 * Run all auto-seed operations
 */
async function runAutoSeed() {
    await seedPermissionsIfNeeded();
    await ensureWidgetSiteKeyColumn();
}

module.exports = { runAutoSeed, seedPermissionsIfNeeded, ensureWidgetSiteKeyColumn };
