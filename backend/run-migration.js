const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Iniciando migración de base de datos...');
        
        await pool.query(`
            ALTER TABLE usuarios 
            ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255),
            ADD COLUMN IF NOT EXISTS mfa_habilitado BOOLEAN DEFAULT FALSE;
        `);
        console.log('Columnas MFA agregadas a la tabla usuarios.');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS auditoria_root (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id),
                accion VARCHAR(255) NOT NULL,
                endpoint VARCHAR(255),
                detalles JSONB,
                fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Tabla auditoria_root creada.');

    } catch (error) {
        console.error('Error durante la migración:', error);
    } finally {
        pool.end();
    }
}

migrate();
