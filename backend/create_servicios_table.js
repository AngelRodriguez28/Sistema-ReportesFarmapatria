const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'SistemaReportesFP',
  password: 'p@ssw0rd',
  port: 5432
});

const query = `
  CREATE TABLE IF NOT EXISTS reportes_servicios (
    id SERIAL PRIMARY KEY,
    numero_reporte VARCHAR(50) UNIQUE NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id),
    tipo_servicio VARCHAR(100) NOT NULL,
    proveedor VARCHAR(100),
    tiempo_sin_servicio VARCHAR(100),
    descripcion TEXT,
    archivo_adjunto VARCHAR(255),
    estado VARCHAR(50) DEFAULT 'Pendiente',
    tecnico_id INTEGER REFERENCES usuarios(id),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

pool.query(query)
  .then(() => console.log('Table reportes_servicios created successfully.'))
  .catch(console.error)
  .finally(() => pool.end());
