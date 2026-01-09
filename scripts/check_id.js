require('dotenv').config();
const { connectSql, getPool } = require('../src/infra/sql/pool');
const fs = require('fs');

async function run() {
    try {
        await connectSql();
        const pool = getPool();

        let output = '--- ALL WORKSPACES ---\n';
        const ws = await pool.request().query('SELECT WorkspaceId, Name, WorkspaceKey FROM iam.Workspaces');
        ws.recordset.forEach(r => {
            output += `ID: ${r.WorkspaceId} | Name: ${r.Name} | Key: ${r.WorkspaceKey}\n`;
        });

        output += '\n--- ALL WIDGETS ---\n';
        const w = await pool.request().query('SELECT TOP 10 WidgetId, SiteKey, Name, WorkspaceKey FROM iam.Widgets');
        w.recordset.forEach(r => {
            output += `WidgetID: ${r.WidgetId} | SiteKey: ${r.SiteKey} | Name: ${r.Name} | WsKey: ${r.WorkspaceKey}\n`;
        });

        fs.writeFileSync('debug_output.txt', output);
        console.log('Done writing to debug_output.txt');
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('debug_output.txt', `Error: ${err.message}`);
        process.exit(1);
    }
}
run();
