const Joi = require('joi');
const constants = require('../../config/constants');

/**
 * Validation schema for creating a workspace
 */
const createWorkspace = Joi.object({
    name: Joi.string()
        .trim()
        .min(3)
        .max(255)
        .required()
        .custom((value, helpers) => {
            if (value.length === 0) {
                return helpers.error('string.empty');
            }
            return value.replace(/\s+/g, ' ');
        })
        .messages({
            'string.empty': 'Workspace name cannot be empty',
            'string.min': 'Workspace name must be at least 3 characters',
            'string.max': 'Workspace name cannot exceed 255 characters',
            'any.required': 'Workspace name is required',
        }),
});

/**
 * Validation schema for inviting a member to workspace
 * 
 * RULE: Cannot invite with role "Owner" (Owner is non-transferable)
 */
const inviteMember = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Valid email address is required',
            'any.required': 'Email is required',
        }),
    role: Joi.string()
        .trim()
        .min(1)
        .max(100)
        .required()
        .custom((value, helpers) => {
            // RULE B1: Cannot invite with protected role (Owner)
            if (constants.PROTECTED_ROLES.includes(value)) {
                return helpers.message(`Role "${value}" is protected and cannot be assigned via invite`);
            }
            return value;
        })
        .messages({
            'any.required': 'Role is required',
        }),
    // Optional: custom message for invite email
    message: Joi.string()
        .trim()
        .max(500)
        .optional()
        .allow(''),
});

/**
 * Validation schema for accepting an invite
 */
const acceptInvite = Joi.object({
    token: Joi.string()
        .required()
        .messages({
            'any.required': 'Invite token is required',
        }),
});

/**
 * Validation schema for updating workspace settings
 */
const updateWorkspace = Joi.object({
    name: Joi.string()
        .trim()
        .min(3)
        .max(255)
        .optional()
        .custom((value, helpers) => {
            if (value && value.length === 0) {
                return helpers.error('string.empty');
            }
            return value ? value.replace(/\s+/g, ' ') : value;
        }),
    // Add more settings as needed
    // timezone: Joi.string().optional(),
    // brandColor: Joi.string().pattern(/^#([0-9A-F]{3}){1,2}$/i).optional(),
}).min(1).messages({
    'object.min': 'At least one field is required for update',
});

/**
 * Validation schema for assigning role to member
 * 
 * RULE: Cannot assign protected roles (Owner)
 */
const assignRole = Joi.object({
    role: Joi.string()
        .trim()
        .min(1)
        .max(100)
        .required()
        .custom((value, helpers) => {
            if (constants.PROTECTED_ROLES.includes(value)) {
                return helpers.message(`Role "${value}" is protected and cannot be assigned`);
            }
            return value;
        })
        .messages({
            'any.required': 'Role is required',
        }),
});

module.exports = {
    createWorkspace,
    inviteMember,
    acceptInvite,
    updateWorkspace,
    assignRole,
};
