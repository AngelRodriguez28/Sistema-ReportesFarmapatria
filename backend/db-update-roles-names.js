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
        console.log("Actualizando nombres y categorías en la tabla 'roles'...");
        
        // 1. Super Administrador (ID 1): nombre -> 'Super Administrador', categoria -> 'Control del Sistema'
        await pool.query(
            "UPDATE roles SET nombre = 'Super Administrador', categoria = 'Control del Sistema' WHERE id = 1"
        );
        console.log("Rol ID 1 (Super Administrador) actualizado.");

        // 2. Soporte Aplicaciones (ID 5): nombre -> 'Aplicaciones', categoria -> 'Soporte' (dejar su categoria)
        await pool.query(
            "UPDATE roles SET nombre = 'Aplicaciones', categoria = 'Soporte' WHERE id = 5"
        );
        console.log("Rol ID 5 (Aplicaciones) actualizado.");

        // 3. Gerente 1 (ID 6): categoria -> 'Gerencia De Tecnologia' (nombre sigue siendo Gerente 1)
        await pool.query(
            "UPDATE roles SET categoria = 'Gerencia De Tecnologia' WHERE id = 6"
        );
        console.log("Rol ID 6 (Gerente 1) actualizado.");

        console.log("¡Migración de nombres de roles finalizada con éxito!");
    } catch (e) {
        console.error("Error al modificar la base de datos:", e);
    } finally {
        pool.end();
    }
}

runMigration();
