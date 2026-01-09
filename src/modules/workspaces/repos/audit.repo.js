const { getPool, sql } = require('../../../infra/sql/pool');

/**
 * Get request object - uses transaction if provided, otherwise pool
 */
const getRequest = (txn) => txn ? txn.request() : getPool().request();

/**
 * Log an audit event
 * 
 * TODO: Create audit.AuditLogs table if not exists:
 * CREATE TABLE audit.AuditLogs (
 *   LogKey BIGINT IDENTITY(1,1) PRIMARY KEY,
 *   Event NVARCHAR(100) NOT NULL,
 *   ActorUserKey BIGINT NULL,
 *   ActorMembershipKey BIGINT NULL,
 *   WorkspaceKey BIGINT NULL,
 *   ResourceType NVARCHAR(50) NULL,
 *   ResourceKey BIGINT NULL,
 *   Metadata NVARCHAR(MAX) NULL,
 *   CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
 * );
 * 
 * @param {string} event - Event name (e.g., 'workspace.created')
 * @param {object} data - Event data
 * @param {number} data.actorUserKey - User who performed the action
 * @param {number} data.actorMembershipKey - Membership context (optional)
 * @param {number} data.workspaceKey - Workspace context (optional)
 * @param {string} data.resourceType - Resource type (optional)
 * @param {number} data.resourceKey - Resource key (optional)
 * @param {object} data.metadata - Additional metadata (optional)
 * @param {object} txn - SQL transaction (optional)
 * @returns {Promise<void>}
 */
const log = async (event, data, txn = null) => {
    const {
        actorUserKey = null,
        actorMembershipKey = null,
        workspaceKey = null,
        resourceType = null,
        resourceKey = null,
        metadata = null,
    } = data;

    // Check if audit table exists
    const tableCheck = await getPool().request()
        .query(`
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'audit' AND TABLE_NAME = 'AuditLogs'
    `);

    if (tableCheck.recordset.length === 0) {
        // Table doesn't exist, log to console instead
        // TODO: Create audit table in migration script
        console.log('[AUDIT]', {
            event,
            actorUserKey,
            actorMembershipKey,
            workspaceKey,
            resourceType,
            resourceKey,
            metadata,
            timestamp: new Date().toISOString(),
        });
        return;
    }

    // Insert into audit table
    await getRequest(txn)
        .input('event', sql.NVarChar(100), event)
        .input('actorUserKey', sql.BigInt, actorUserKey)
        .input('actorMembershipKey', sql.BigInt, actorMembershipKey)
        .input('workspaceKey', sql.BigInt, workspaceKey)
        .input('resourceType', sql.NVarChar(50), resourceType)
        .input('resourceKey', sql.BigInt, resourceKey)
        .input('metadata', sql.NVarChar, metadata ? JSON.stringify(metadata) : null)
        .query(`
      INSERT INTO audit.AuditLogs 
        (Event, ActorUserKey, ActorMembershipKey, WorkspaceKey, ResourceType, ResourceKey, Metadata)
      VALUES 
        (@event, @actorUserKey, @actorMembershipKey, @workspaceKey, @resourceType, @resourceKey, @metadata)
    `);
};

module.exports = {
    log,
};
