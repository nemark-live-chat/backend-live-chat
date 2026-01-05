/*
   PATCH SCRIPT
   Purpose: Fix missing iam.RefreshTokens and iam.UserCredentials columns
   Reason: database.sql was outdated compared to code requirements.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

-- 1. Create iam.RefreshTokens if missing
IF OBJECT_ID('iam.RefreshTokens', 'U') IS NULL
BEGIN
    PRINT 'Creating iam.RefreshTokens...';
    CREATE TABLE iam.RefreshTokens (
        RefreshTokenKey BIGINT IDENTITY(1,1) NOT NULL,
        UserKey BIGINT NOT NULL,
        TokenHash NVARCHAR(MAX) NOT NULL, -- Store hash, not raw token
        
        ExpiresAt DATETIME2(3) NOT NULL,
        RevokedAt DATETIME2(3) NULL,
        FamilyId UNIQUEIDENTIFIER NULL, -- For rotation families
        
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedByIp NVARCHAR(50) NULL,
        UserAgent NVARCHAR(500) NULL,

        CONSTRAINT PK_RefreshTokens PRIMARY KEY (RefreshTokenKey),
        CONSTRAINT FK_RefreshTokens_User
            FOREIGN KEY (UserKey) REFERENCES iam.Users(UserKey) ON DELETE CASCADE
    );
END
ELSE
BEGIN
    PRINT 'iam.RefreshTokens already exists.';
END

-- 2. Add FailedLoginAttempts to iam.UserCredentials if missing
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'FailedLoginAttempts' AND Object_ID = Object_ID(N'iam.UserCredentials'))
BEGIN
    PRINT 'Adding FailedLoginAttempts column...';
    ALTER TABLE iam.UserCredentials ADD FailedLoginAttempts TINYINT NOT NULL DEFAULT 0;
END

-- 3. Add LockUntil to iam.UserCredentials if missing
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'LockUntil' AND Object_ID = Object_ID(N'iam.UserCredentials'))
BEGIN
    PRINT 'Adding LockUntil column...';
    ALTER TABLE iam.UserCredentials ADD LockUntil DATETIME2(3) NULL;
END

COMMIT;
PRINT 'Patch applied successfully.';
