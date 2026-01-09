require('dotenv').config();
const { connectSql, getPool } = require('../src/infra/sql/pool');
const fs = require('fs');

async function run() {
    try {
        await connectSql();
        const pool = getPool();

        const res = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'iam' AND TABLE_NAME = 'WidgetConversations'
        `);

        let output = '--- COLUMNS ---\n';
        res.recordset.forEach(c => {
            output += `${c.COLUMN_NAME} (${c.DATA_TYPE})\n`;
        });

        fs.writeFileSync('schema_output.txt', output);
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('schema_output.txt', `Error: ${err.message}`);
        process.exit(1);
    }
}
run();
