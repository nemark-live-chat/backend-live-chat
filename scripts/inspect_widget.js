require('dotenv').config();
const { connectSql, getPool } = require('../src/infra/sql/pool');
const fs = require('fs');

async function run() {
    try {
        await connectSql();
        const pool = getPool();

        const siteKey = '6068c061b0d53392cf2e8640';

        const res = await pool.request().query(`
            SELECT WidgetKey, Name, Status, AllowedDomains, Theme, SiteKey
            FROM iam.Widgets 
            WHERE SiteKey = '${siteKey}'
        `);

        let output = '';
        if (res.recordset.length > 0) {
            const w = res.recordset[0];
            output += `Name: ${w.Name}\n`;
            output += `Status: ${w.Status} (1=Active, 0=Inactive)\n`;
            output += `AllowedDomains: ${w.AllowedDomains}\n`;
            output += `Theme: ${w.Theme}\n`;
        } else {
            output = 'Widget not found!';
        }

        fs.writeFileSync('inspect_output.txt', output);
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('inspect_output.txt', `Error: ${err.message}`);
        process.exit(1);
    }
}
run();
