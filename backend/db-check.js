const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: 'localhost',
    database: process.env.DB_NAME || 'farmapatria_db', // Asumiendo el nombre
    password: process.env.DB_PASSWORD,
    port: 5432,
});

async function checkDB() {
    try {
        console.log("Verificando si existe la tabla 'roles'...");
        const rolesCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'roles'
        `);

        if (rolesCheck.rows.length > 0) {
            console.log("La tabla 'roles' EXISTE. Mostrando roles actuales:");
            const roles = await pool.query('SELECT * FROM roles ORDER BY id ASC');
            console.table(roles.rows);
        } else {
            console.log("La tabla 'roles' NO existe. El rol_id en 'usuarios' es probablemente un INT normal sin llave foránea.");
            
            // Revisar la tabla usuarios
            const colCheck = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'usuarios' AND column_name = 'rol_id'
            `);
            console.log("Columna rol_id en usuarios:", colCheck.rows);
        }
    } catch (err) {
        console.error("Error consultando BD:", err);
    } finally {
        pool.end();
    }
}

checkDB();
