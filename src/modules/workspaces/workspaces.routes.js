const express = require('express');
const router = express.Router();
const controller = require('./workspaces.controller');
const validate = require('../../middlewares/validate');
const schema = require('./workspaces.validate');
const authenticate = require('../../middlewares/authenticate');
const requireWorkspaceMember = require('../../middlewares/requireWorkspaceMember');
const authorize = require('../../middlewares/authorize');

// ============================================
// WORKSPACE ENDPOINTS (no workspace context needed)
// ============================================

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/workspaces
 * Create a new workspace
 */
router.post('/',
    validate(schema.createWorkspace),
    controller.createWorkspace
);

/**
 * GET /api/workspaces
 * List workspaces for current user
 */
router.get('/',
    controller.listWorkspaces
);

// ============================================
// INVITE ACCEPT (no workspace context needed)
// ============================================

/**
 * POST /api/workspaces/invites/accept
 * Accept an invite (token in body)
 */
router.post('/invites/accept',
    validate(schema.acceptInvite),
    controller.acceptInvite
);

// ============================================
// WORKSPACE-SCOPED ROUTES (require workspace context)
// ============================================

// All routes below require workspace membership
router.use('/:workspaceId', (req, res, next) => {
    // Set workspaceId in headers for requireWorkspaceMember middleware
    if (req.params.workspaceId) {
        req.headers['x-workspace-id'] = req.params.workspaceId;
    }
    next();
}, requireWorkspaceMember);

// --- INVITES ---

/**
 * POST /api/workspaces/:workspaceId/invites
 * Invite a member to workspace
 * Requires: member.invite permission
 */
router.post('/:workspaceId/invites',
    authorize('member.invite'),
    validate(schema.inviteMember),
    controller.inviteMember
);

/**
 * GET /api/workspaces/:workspaceId/invites
 * List pending invites
 * Requires: member.read permission
 */
router.get('/:workspaceId/invites',
    authorize('member.read'),
    controller.listInvites
);

/**
 * DELETE /api/workspaces/:workspaceId/invites/:inviteKey
 * Revoke a pending invite
 * Requires: member.invite permission
 */
router.delete('/:workspaceId/invites/:inviteKey',
    authorize('member.invite'),
    controller.revokeInvite
);

// --- MEMBERS ---

/**
 * GET /api/workspaces/:workspaceId/members
 * List workspace members
 * Requires: member.read permission
 */
router.get('/:workspaceId/members',
    authorize('member.read'),
    controller.listMembers
);

/**
 * DELETE /api/workspaces/:workspaceId/members/:membershipKey
 * Remove a member from workspace
 * Requires: member.remove permission
 */
router.delete('/:workspaceId/members/:membershipKey',
    authorize('member.remove'),
    controller.removeMember
);

/**
 * PATCH /api/workspaces/:workspaceId/members/:membershipKey/role
 * Assign role to member
 * Requires: role.manage permission
 */
router.patch('/:workspaceId/members/:membershipKey/role',
    authorize('role.manage'),
    validate(schema.assignRole),
    controller.assignRole
);

module.exports = router;
