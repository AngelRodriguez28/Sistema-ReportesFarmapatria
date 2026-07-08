const fs = require('fs');
const { marked } = require('marked');
const { execSync } = require('child_process');
const path = require('path');

const mdPath = 'documentacion_tecnica_farmapatria.md';
const docPath = 'Documentacion_Tecnica_Farmapatria.doc';
const htmlPath = 'temp_print.html';
const pdfPath = 'Documentacion_Tecnica_Farmapatria.pdf';

const mdContent = fs.readFileSync(mdPath, 'utf-8');

// Agregar CSS básico para que el PDF y Word se vean elegantes
const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 2cm; }
        h1, h2, h3 { color: #273376; }
        h1 { border-bottom: 2px solid #273376; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px; }
        code { background-color: #f4f4f4; padding: 2px 5px; border-radius: 4px; font-family: monospace; }
        pre { background-color: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        table, th, td { border: 1px solid #ddd; }
        th, td { padding: 10px; text-align: left; }
        th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    ${marked.parse(mdContent)}
</body>
</html>
`;

// Crear el archivo .doc (Word lee HTML nativamente si tiene extensión .doc)
fs.writeFileSync(docPath, htmlContent, 'utf-8');
console.log('Documento Word (.doc) generado.');

// Crear un HTML temporal para el PDF
fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

// Generar PDF usando Microsoft Edge en modo headless (disponible en todos los Windows 10/11)
try {
    console.log('Generando PDF con Edge...');
    const command = `start /wait msedge --headless --print-to-pdf="${path.join(process.cwd(), pdfPath)}" "${path.join(process.cwd(), htmlPath)}"`;
    execSync(command, { stdio: 'inherit' });
    console.log('Documento PDF generado.');
} catch (error) {
    console.error('Error al generar PDF:', error.message);
}

// Limpiar HTML temporal
if (fs.existsSync(htmlPath)) {
    fs.unlinkSync(htmlPath);
}
