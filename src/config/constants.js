const constants = {
  PERMISSION: {
    ALLOW: 1,
    DENY: 2, // NOTE: Schema uses 1=Allow, 2=Deny
  },
  USER_STATUS: {
    ACTIVE: 1,
    SUSPENDED: 2,
    DELETED: 3,
  },
  WORKSPACE_STATUS: {
    ACTIVE: 1,
    SUSPENDED: 2,
  },
  MEMBERSHIP_STATUS: {
    ACTIVE: 1,
    INVITED: 2,
    SUSPENDED: 3,
  },
  AUTH: {
    SALT_ROUNDS: 10,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
    PASSWORD_MIN_LENGTH: 8,
  },
  /**
   * Protected roles that cannot be assigned via invite or role management APIs.
   * Only assigned during workspace creation.
   */
  PROTECTED_ROLES: ['Owner'],
  /**
   * Default permission codes granted to the Owner role.
   * All these must exist in iam.Permissions table.
   * If any is missing, workspace creation will fail with 500.
   */
  OWNER_DEFAULT_PERMISSIONS: [
    // Workspace management
    'workspace.manage',
    // Member management
    'member.invite',
    'member.read',
    'member.remove',
    // Role & permission management
    'role.manage',
    'role.read',
    'permission.read',
    // Widget management
    'widget.manage',
    'widget.read',
    // Conversation management
    'conversation.read',
    'conversation.reply',
    'conversation.assign',
    'conversation.close',
    'conversation.note',
    'conversation.tag',
    // Contact management
    'contact.read',
    'contact.create',
    'contact.update',
    'contact.merge',
    // Reporting
    'report.view',
    'report.export',
    // Audit
    'audit.read',
    // Integrations
    'integration.manage',
    // Billing
    'billing.view',
    'billing.manage',
  ],
};

module.exports = constants;
