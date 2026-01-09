const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connect, getPool, sql } = require('../src/infra/sql/pool');

const migrate = async () => {
    try {
        console.log('Connecting to database...');
        await connect();
        const pool = getPool();

        console.log('Checking if Settings column exists in iam.Workspaces...');
        const checkResult = await pool.request().query("SELECT COL_LENGTH('iam.Workspaces', 'Settings') AS ColLength");

        if (checkResult.recordset[0].ColLength !== null) {
            console.log('Settings column already exists.');
        } else {
            console.log('Adding Settings column to iam.Workspaces...');
            await pool.request().query("ALTER TABLE iam.Workspaces ADD Settings NVARCHAR(MAX) NULL");
            console.log('Successfully added Settings column.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
