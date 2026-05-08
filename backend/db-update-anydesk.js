const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function runMigration() {
    try {
        console.log("Adding column imagen_anydesk to tickets...");
        await pool.query('ALTER TABLE tickets ADD COLUMN imagen_anydesk VARCHAR(255);');
        console.log("Column added successfully!");
    } catch (e) {
        if (e.code === '42701') {
            console.log("Column already exists. Skipping.");
        } else {
            console.error("Error modifying database:", e);
        }
    } finally {
        pool.end();
    }
}

runMigration();
