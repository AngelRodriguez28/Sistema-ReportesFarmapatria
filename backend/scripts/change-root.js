const readline = require('readline');
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
    try {
        console.log('=== Actualización de Credenciales del Usuario ROOT ===');
        const nombreInput = await askQuestion('Ingrese el nombre genérico para ROOT (por defecto: Administrador): ');
        const nombre = nombreInput.trim() || 'Administrador';

        const apellidoInput = await askQuestion('Ingrese el apellido genérico para ROOT (por defecto: ROOT): ');
        const apellido = apellidoInput.trim() || 'ROOT';

        const email = await askQuestion('Ingrese el nuevo correo corporativo de ROOT (ej: root@farmapatria.gob.ve): ');
        if (!email || !email.includes('@')) {
            console.error('Correo inválido.');
            rl.close();
            process.exit(1);
        }

        const password = await askQuestion('Ingrese la nueva contraseña para ROOT: ');
        if (!password || password.length < 6) {
            console.error('La contraseña debe tener al menos 6 caracteres.');
            rl.close();
            process.exit(1);
        }

        const confirmPassword = await askQuestion('Confirme la contraseña: ');
        if (password !== confirmPassword) {
            console.error('Las contraseñas no coinciden.');
            rl.close();
            process.exit(1);
        }

        console.log('Hasheando contraseña...');
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log('Actualizando base de datos...');
        const result = await pool.query(
            'UPDATE usuarios SET nombre = $1, apellido = $2, email = $3, password = $4 WHERE rol_id = 1 RETURNING id, nombre, apellido, email',
            [nombre, apellido, email.trim(), hashedPassword]
        );

        if (result.rowCount > 0) {
            console.log('\x1b[32m%s\x1b[0m', '¡Credenciales del usuario ROOT actualizadas con éxito!');
            console.table(result.rows);
        } else {
            console.error('No se encontró ningún usuario con rol ROOT (rol_id = 1).');
        }

    } catch (error) {
        console.error('Ocurrió un error:', error);
    } finally {
        rl.close();
        pool.end();
    }
}

main();
