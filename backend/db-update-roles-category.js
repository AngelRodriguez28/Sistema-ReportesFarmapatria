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
        console.log("Añadiendo columna 'categoria' a la tabla 'roles'...");
        await pool.query('ALTER TABLE roles ADD COLUMN IF NOT EXISTS categoria VARCHAR(50);');
        console.log("Columna añadida con éxito (o ya existía).");

        console.log("Actualizando categorías de roles...");
        const updates = [
            { id: 1, categoria: 'Administrador' }, // Administrador
            { id: 2, categoria: 'Farmacia' },      // Jefe de Farmacia
            { id: 3, categoria: 'Soporte' },       // Soporte
            { id: 4, categoria: 'Monitoreo' },     // Gerente General De Tecnologia
            { id: 5, categoria: 'Soporte' },       // Soporte Aplicaciones
            { id: 6, categoria: 'Gerencia' },      // Gerente 1
        ];

        for (const role of updates) {
            await pool.query('UPDATE roles SET categoria = $1 WHERE id = $2', [role.categoria, role.id]);
            console.log(`Rol ID ${role.id} actualizado a categoría '${role.categoria}'`);
        }

        console.log("¡Migración de roles finalizada con éxito!");
    } catch (e) {
        console.error("Error al modificar la base de datos:", e);
    } finally {
        pool.end();
    }
}

runMigration();
