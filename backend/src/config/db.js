const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

pool.connect(async (err, client, release) => {
    if (err) return console.error('Error al conectar con PostgreSQL:', err.stack);
    console.log('¡Conexión exitosa a la base de datos PostgreSQL!');
    if (release) release();
});

module.exports = pool;
