const workspacesService = require('./workspaces.service');
const asyncHandler = require('../../utils/asyncHandler');

// ============================================
// WORKSPACE ENDPOINTS
// ============================================

/**
 * Create a new workspace
 * POST /api/workspaces
 */
const createWorkspace = asyncHandler(async (req, res) => {
    const userKey = req.user?.UserKey || req.user?.key;

    if (!userKey) {
        return res.status(401).json({
            status: 'error',
            message: 'User context not found',
        });
    }

    const { name } = req.body;

    const result = await workspacesService.createWorkspace({
        userKey,
        name,
    });

    res.status(201).json({
        status: 'success',
        data: result,
    });
});

/**
 * List workspaces for current user
 * GET /api/workspaces
 */
const listWorkspaces = asyncHandler(async (req, res) => {
    const userKey = req.user?.UserKey || req.user?.key;

    if (!userKey) {
        return res.status(401).json({
            status: 'error',
            message: 'User context not found',
        });
    }

    const workspaces = await workspacesService.getWorkspacesForUser(userKey);

    res.status(200).json({
        status: 'success',
        data: { workspaces },
    });
});

/**
 * Update workspace settings
 * PATCH /api/workspaces/:workspaceId
 * 
 * Requires: workspace.update permission
 */
const updateWorkspace = asyncHandler(async (req, res) => {
    const { name } = req.body;

    const result = await workspacesService.updateWorkspace({
        workspaceKey: req.workspace.workspaceKey,
        name,
    });

    res.status(200).json({
        status: 'success',
        message: 'Workspace updated successfully',
        data: { workspace: result },
    });
});

// ============================================
// INVITE ENDPOINTS
// ============================================

/**
 * Invite a member to workspace
 * POST /api/workspaces/:workspaceId/invites
 * 
 * Requires: member.invite permission
 * RULE: Cannot invite with role "Owner"
 */
const inviteMember = asyncHandler(async (req, res) => {
    const { email, role } = req.body;

    const result = await workspacesService.inviteMember({
        workspaceKey: req.workspace.workspaceKey,
        membershipKey: req.workspace.membershipKey,
        email,
        role,
    });

    res.status(201).json({
        status: 'success',
        message: 'Invite sent successfully',
        data: result,
    });
});

/**
 * Accept an invite
 * POST /api/invites/accept
 * 
 * Requires: authentication only (no workspace context)
 */
const acceptInvite = asyncHandler(async (req, res) => {
    const userKey = req.user?.UserKey || req.user?.key;
    const { token } = req.body;

    const result = await workspacesService.acceptInvite({
        token,
        userKey,
    });

    res.status(200).json({
        status: 'success',
        message: 'Welcome to the workspace!',
        data: result,
    });
});

/**
 * List pending invites
 * GET /api/workspaces/:workspaceId/invites
 * 
 * Requires: member.read permission
 */
const listInvites = asyncHandler(async (req, res) => {
    const invites = await workspacesService.listInvites(req.workspace.workspaceKey);

    res.status(200).json({
        status: 'success',
        data: { invites },
    });
});

/**
 * Revoke an invite
 * DELETE /api/workspaces/:workspaceId/invites/:inviteKey
 * 
 * Requires: member.invite permission
 */
const revokeInvite = asyncHandler(async (req, res) => {
    const { inviteKey } = req.params;

    await workspacesService.revokeInvite({
        workspaceKey: req.workspace.workspaceKey,
        inviteKey,
        membershipKey: req.workspace.membershipKey,
    });

    res.status(200).json({
        status: 'success',
        message: 'Invite revoked',
    });
});

// ============================================
// MEMBER ENDPOINTS
// ============================================

/**
 * List members of workspace
 * GET /api/workspaces/:workspaceId/members
 * 
 * Requires: member.read permission
 */
const listMembers = asyncHandler(async (req, res) => {
    const members = await workspacesService.listMembers(req.workspace.workspaceKey);

    res.status(200).json({
        status: 'success',
        data: { members },
    });
});

/**
 * Remove a member from workspace
 * DELETE /api/workspaces/:workspaceId/members/:membershipKey
 * 
 * Requires: member.remove permission
 * RULE: Cannot remove an Owner
 */
const removeMember = asyncHandler(async (req, res) => {
    const { membershipKey } = req.params;

    await workspacesService.removeMember({
        workspaceKey: req.workspace.workspaceKey,
        targetMembershipKey: parseInt(membershipKey),
        actorMembershipKey: req.workspace.membershipKey,
    });

    res.status(200).json({
        status: 'success',
        message: 'Member removed',
    });
});

/**
 * Assign role to member
 * PATCH /api/workspaces/:workspaceId/members/:membershipKey/role
 * 
 * Requires: role.manage permission
 * RULE: Cannot assign "Owner" role
 */
const assignRole = asyncHandler(async (req, res) => {
    const { membershipKey } = req.params;
    const { role } = req.body;

    await workspacesService.assignRole({
        workspaceKey: req.workspace.workspaceKey,
        targetMembershipKey: parseInt(membershipKey),
        role,
        actorMembershipKey: req.workspace.membershipKey,
    });

    res.status(200).json({
        status: 'success',
        message: `Role "${role}" assigned successfully`,
    });
});

module.exports = {
    // Workspace
    createWorkspace,
    updateWorkspace,
    listWorkspaces,
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
