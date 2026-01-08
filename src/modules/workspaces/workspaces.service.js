const sql = require('mssql');
const { getPool } = require('../../infra/sql/pool');
const workspaceRepo = require('./repos/workspace.repo');
const membershipRepo = require('./repos/membership.repo');
const roleRepo = require('./repos/role.repo');
const membershipRoleRepo = require('./repos/membershipRole.repo');
const permissionRepo = require('./repos/permission.repo');
const roleGrantRepo = require('./repos/roleGrant.repo');
const effectivePermissionRepo = require('./repos/effectivePermission.repo');
const auditRepo = require('./repos/audit.repo');
const inviteRepo = require('./repos/invite.repo');
const userRepo = require('../auth/repos/user.repo');
const constants = require('../../config/constants');
const AppError = require('../../utils/AppError');

// ============================================
// WORKSPACE CREATION
// ============================================

/**
 * Create a new workspace with full ownership chain
 */
const createWorkspace = async ({ userKey, name }) => {
    const pool = getPool();
    const txn = new sql.Transaction(pool);

    try {
        await txn.begin();

        // 1. Insert workspace
        const workspace = await workspaceRepo.insertWorkspace(name, txn);

        // 2. Insert membership for creator
        const membership = await membershipRepo.insertMembership(
            workspace.WorkspaceKey,
            userKey,
            txn
        );

        // 3. Get or create Owner role
        const ownerRole = await roleRepo.getOrCreateOwnerRole(
            workspace.WorkspaceKey,
            txn
        );

        // 4. Attach Owner role to membership
        await membershipRoleRepo.attachRole(
            membership.MembershipKey,
            ownerRole.RoleKey,
            txn
        );

        // 5. Get permission keys and grant to Owner role
        const permissionKeys = await permissionRepo.getPermissionKeysByCodes(
            constants.OWNER_DEFAULT_PERMISSIONS
        );

        await roleGrantRepo.ensureRoleGrants(
            ownerRole.RoleKey,
            permissionKeys,
            txn
        );

        // 6. Rebuild effective permissions
        await effectivePermissionRepo.rebuild(membership.MembershipKey, txn);

        // 7. Log audit event
        await auditRepo.log('workspace.created', {
            actorUserKey: userKey,
            actorMembershipKey: membership.MembershipKey,
            workspaceKey: workspace.WorkspaceKey,
            resourceType: 'workspace',
            resourceKey: workspace.WorkspaceKey,
            metadata: {
                workspaceId: workspace.WorkspaceId,
                name: workspace.Name,
            },
        }, txn);

        await txn.commit();

        return {
            workspace: {
                workspaceKey: workspace.WorkspaceKey,
                workspaceId: workspace.WorkspaceId,
                name: workspace.Name,
                status: workspace.Status,
                createdAt: workspace.CreatedAt,
            },
            membership: {
                membershipKey: membership.MembershipKey,
                membershipId: membership.MembershipId,
                role: 'Owner',
            },
        };
    } catch (err) {
        try {
            await txn.rollback();
        } catch (rollbackErr) {
            console.error('Transaction rollback failed:', rollbackErr);
        }

        if (err.number === 2627 || err.number === 2601) {
            throw new AppError('Workspace creation conflict. Please try again.', 409);
        }

        if (err instanceof AppError) {
            throw err;
        }

        console.error('Workspace creation failed:', err);
        throw new AppError('Failed to create workspace', 500);
    }
};

/**
 * Get workspaces for a user
 */
const getWorkspacesForUser = async (userKey) => {
    const pool = getPool();
    const result = await pool.request()
        .input('userKey', sql.BigInt, userKey)
        .query(`
      SELECT 
        w.WorkspaceKey,
        w.WorkspaceId,
        w.Name,
        w.Status,
        w.CreatedAt,
        m.MembershipKey,
        m.MembershipId,
        m.Status AS MembershipStatus
      FROM iam.Memberships m
      JOIN iam.Workspaces w ON w.WorkspaceKey = m.WorkspaceKey
      WHERE m.UserKey = @userKey
        AND m.Status = 1
        AND w.Status = 1
      ORDER BY w.CreatedAt DESC
    `);

    return result.recordset.map(row => ({
        workspaceKey: row.WorkspaceKey,
        workspaceId: row.WorkspaceId,
        name: row.Name,
        status: row.Status,
        createdAt: row.CreatedAt,
        membership: {
            membershipKey: row.MembershipKey,
            membershipId: row.MembershipId,
            status: row.MembershipStatus,
        },
    }));
};

// ============================================
// MEMBER INVITATION
// ============================================

/**
 * Invite a member to workspace
 * 
 * RULE: Cannot invite with protected role (Owner)
 * 
 * @param {object} params
 * @param {number} params.workspaceKey - Workspace to invite to
 * @param {number} params.membershipKey - Inviter's membership key
 * @param {string} params.email - Email to invite
 * @param {string} params.role - Role to assign on accept
 * @returns {Promise<object>} Invite details with token
 */
const inviteMember = async ({ workspaceKey, membershipKey, email, role }) => {
    // RULE B1: Cannot invite with protected role
    if (constants.PROTECTED_ROLES.includes(role)) {
        throw new AppError(`Role "${role}" is non-transferable and cannot be assigned via invite`, 403);
    }

    // Check if user is already a member
    const existingUser = await userRepo.findByEmail(email);
    if (existingUser) {
        const existingMembership = await membershipRepo.findByWorkspaceAndUser(
            workspaceKey,
            existingUser.UserKey
        );
        if (existingMembership) {
            throw new AppError('User is already a member of this workspace', 409);
        }
    }

    // Check for existing pending invite
    const existingInvite = await inviteRepo.findPendingByEmail(workspaceKey, email);
    if (existingInvite) {
        throw new AppError('An invite is already pending for this email', 409);
    }

    // Check if role exists in workspace (or create it)
    const roleRecord = await roleRepo.findByName(workspaceKey, role);
    if (!roleRecord) {
        throw new AppError(`Role "${role}" does not exist in this workspace`, 400);
    }

    // Create invite (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await inviteRepo.createInvite({
        workspaceKey,
        email,
        roleName: role,
        invitedByMembershipKey: membershipKey,
        expiresAt,
    });

    // Log audit
    await auditRepo.log('member.invited', {
        actorMembershipKey: membershipKey,
        workspaceKey,
        resourceType: 'invite',
        resourceKey: invite.InviteKey,
        metadata: { email, role },
    });

    // TODO: Send invite email with token
    console.log(`[EMAIL MOCK] Invite token for ${email}: ${invite.token}`);

    return {
        inviteKey: invite.InviteKey,
        inviteId: invite.InviteId,
        email: invite.Email,
        role: invite.RoleName,
        expiresAt: invite.ExpiresAt,
        // Only return token in dev for testing
        ...(process.env.NODE_ENV !== 'production' && { token: invite.token }),
    };
};

/**
 * Accept an invite and join workspace
 * 
 * @param {object} params
 * @param {string} params.token - Invite token
 * @param {number} params.userKey - User accepting the invite
 * @returns {Promise<object>} Membership details
 */
const acceptInvite = async ({ token, userKey }) => {
    // Find invite by token
    const invite = await inviteRepo.findByToken(token);

    if (!invite) {
        throw new AppError('Invalid invite token', 400);
    }

    if (invite.Status !== inviteRepo.INVITE_STATUS.PENDING) {
        throw new AppError('Invite is no longer valid', 400);
    }

    if (new Date(invite.ExpiresAt) < new Date()) {
        throw new AppError('Invite has expired', 400);
    }

    // Check if user is already a member
    const existingMembership = await membershipRepo.findByWorkspaceAndUser(
        invite.WorkspaceKey,
        userKey
    );
    if (existingMembership) {
        throw new AppError('You are already a member of this workspace', 409);
    }

    // Get the role
    const roleRecord = await roleRepo.findByName(invite.WorkspaceKey, invite.RoleName);
    if (!roleRecord) {
        throw new AppError('Assigned role no longer exists', 500);
    }

    const pool = getPool();
    const txn = new sql.Transaction(pool);

    try {
        await txn.begin();

        // Create membership
        const membership = await membershipRepo.insertMembership(
            invite.WorkspaceKey,
            userKey,
            txn
        );

        // Assign role
        await membershipRoleRepo.attachRole(
            membership.MembershipKey,
            roleRecord.RoleKey,
            txn
        );

        // Rebuild effective permissions
        await effectivePermissionRepo.rebuild(membership.MembershipKey, txn);

        // Mark invite as accepted
        await inviteRepo.markAccepted(invite.InviteKey, txn);

        // Log audit
        await auditRepo.log('member.joined', {
            actorUserKey: userKey,
            actorMembershipKey: membership.MembershipKey,
            workspaceKey: invite.WorkspaceKey,
            resourceType: 'membership',
            resourceKey: membership.MembershipKey,
            metadata: { role: invite.RoleName, inviteKey: invite.InviteKey },
        }, txn);

        await txn.commit();

        return {
            membershipKey: membership.MembershipKey,
            membershipId: membership.MembershipId,
            workspaceKey: invite.WorkspaceKey,
            workspaceId: invite.WorkspaceId,
            workspaceName: invite.WorkspaceName,
            role: invite.RoleName,
        };
    } catch (err) {
        try {
            await txn.rollback();
        } catch (rollbackErr) {
            console.error('Transaction rollback failed:', rollbackErr);
        }
        throw err;
    }
};

/**
 * List pending invites for a workspace
 */
const listInvites = async (workspaceKey) => {
    const invites = await inviteRepo.findPendingByWorkspace(workspaceKey);
    return invites.map(inv => ({
        inviteKey: inv.InviteKey,
        inviteId: inv.InviteId,
        email: inv.Email,
        role: inv.RoleName,
        invitedBy: inv.InvitedByName,
        expiresAt: inv.ExpiresAt,
        createdAt: inv.CreatedAt,
    }));
};

/**
 * Revoke a pending invite
 */
const revokeInvite = async ({ workspaceKey, inviteKey, membershipKey }) => {
    const invite = await inviteRepo.findPendingByWorkspace(workspaceKey);
    const target = invite.find(i => i.InviteKey === parseInt(inviteKey));

    if (!target) {
        throw new AppError('Invite not found', 404);
    }

    await inviteRepo.revokeInvite(inviteKey);

    await auditRepo.log('member.invite_revoked', {
        actorMembershipKey: membershipKey,
        workspaceKey,
        resourceType: 'invite',
        resourceKey: inviteKey,
        metadata: { email: target.Email },
    });

    return { success: true };
};

// ============================================
// MEMBER MANAGEMENT
// ============================================

/**
 * List members of a workspace
 */
const listMembers = async (workspaceKey) => {
    const pool = getPool();
    const result = await pool.request()
        .input('workspaceKey', sql.BigInt, workspaceKey)
        .query(`
      SELECT 
        m.MembershipKey,
        m.MembershipId,
        m.Status AS MembershipStatus,
        m.CreatedAt AS JoinedAt,
        u.UserKey,
        u.UserId,
        u.Email,
        u.DisplayName,
        STRING_AGG(r.Name, ', ') AS Roles
      FROM iam.Memberships m
      JOIN iam.Users u ON u.UserKey = m.UserKey
      LEFT JOIN iam.MembershipRoles mr ON mr.MembershipKey = m.MembershipKey
      LEFT JOIN iam.Roles r ON r.RoleKey = mr.RoleKey
      WHERE m.WorkspaceKey = @workspaceKey
        AND m.Status = 1
      GROUP BY 
        m.MembershipKey, m.MembershipId, m.Status, m.CreatedAt,
        u.UserKey, u.UserId, u.Email, u.DisplayName
      ORDER BY m.CreatedAt ASC
    `);

    return result.recordset.map(row => ({
        membershipKey: row.MembershipKey,
        membershipId: row.MembershipId,
        status: row.MembershipStatus,
        joinedAt: row.JoinedAt,
        user: {
            userKey: row.UserKey,
            userId: row.UserId,
            email: row.Email,
            displayName: row.DisplayName,
        },
        roles: row.Roles ? row.Roles.split(', ') : [],
    }));
};

/**
 * Remove a member from workspace
 * 
 * RULE: Cannot remove the last Owner
 */
const removeMember = async ({ workspaceKey, targetMembershipKey, actorMembershipKey }) => {
    // Cannot remove yourself
    if (targetMembershipKey === actorMembershipKey) {
        throw new AppError('Cannot remove yourself from workspace', 400);
    }

    // Check if target is an Owner
    const isOwner = await membershipRoleRepo.hasRole(targetMembershipKey, 'Owner');
    if (isOwner) {
        throw new AppError('Cannot remove an Owner from the workspace', 403);
    }

    const pool = getPool();
    const txn = new sql.Transaction(pool);

    try {
        await txn.begin();

        // Soft delete membership (set status to suspended/removed)
        await pool.request()
            .input('membershipKey', sql.BigInt, targetMembershipKey)
            .query(`
        UPDATE iam.Memberships
        SET Status = 3
        WHERE MembershipKey = @membershipKey
      `);

        // Remove from MembershipRoles
        await pool.request()
            .input('membershipKey', sql.BigInt, targetMembershipKey)
            .query(`
        DELETE FROM iam.MembershipRoles
        WHERE MembershipKey = @membershipKey
      `);

        // Clear effective permissions
        await pool.request()
            .input('membershipKey', sql.BigInt, targetMembershipKey)
            .query(`
        DELETE FROM iam.MembershipEffectivePermissions
        WHERE MembershipKey = @membershipKey
      `);

        // Log audit
        await auditRepo.log('member.removed', {
            actorMembershipKey,
            workspaceKey,
            resourceType: 'membership',
            resourceKey: targetMembershipKey,
        }, txn);

        await txn.commit();

        return { success: true };
    } catch (err) {
        try {
            await txn.rollback();
        } catch (rollbackErr) {
            console.error('Transaction rollback failed:', rollbackErr);
        }
        throw err;
    }
};

/**
 * Assign role to a member
 * 
 * RULE: Cannot assign protected roles (Owner)
 */
const assignRole = async ({ workspaceKey, targetMembershipKey, role, actorMembershipKey }) => {
    // RULE B1: Cannot assign protected role
    if (constants.PROTECTED_ROLES.includes(role)) {
        throw new AppError(`Role "${role}" is non-transferable and cannot be assigned`, 403);
    }

    // Get role record
    const roleRecord = await roleRepo.findByName(workspaceKey, role);
    if (!roleRecord) {
        throw new AppError(`Role "${role}" does not exist in this workspace`, 400);
    }

    // Attach role
    await membershipRoleRepo.attachRole(targetMembershipKey, roleRecord.RoleKey);

    // Rebuild effective permissions
    await effectivePermissionRepo.rebuild(targetMembershipKey);

    // Log audit
    await auditRepo.log('member.role_assigned', {
        actorMembershipKey,
        workspaceKey,
        resourceType: 'membership',
        resourceKey: targetMembershipKey,
        metadata: { role },
    });

    return { success: true };
};

module.exports = {
    // Workspace
    createWorkspace,
    getWorkspacesForUser,
    // Invite
    inviteMember,
    acceptInvite,
    listInvites,
    revokeInvite,
    // Members
    listMembers,
    removeMember,
    assignRole,
};

