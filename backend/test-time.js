const puppeteer = require('puppeteer');

async function runTest() {
    console.log("Iniciando Puppeteer...");
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('ngOnInit') || text.includes('iniciarSesion') || text.includes('Intentando')) {
            console.log(`[${new Date().toISOString()}] CONSOLA NAV: ${text}`);
        }
    });

    try {
        console.log("Navegando a http://localhost:4201/login...");
        await page.goto('http://localhost:4201/login', { waitUntil: 'networkidle2' });

        console.log("Limpiando localStorage...");
        await page.evaluate(() => localStorage.clear());
        await page.reload({ waitUntil: 'networkidle2' });

        console.log("Llenando credenciales...");
        await page.type('input[name="email"]', 'ruboale3@gmail.com');
        await page.type('input[name="password"]', '123456');

        console.log("Haciendo clic en ingresar...");
        await page.click('button[type="submit"]');

        console.log("Esperando 5 segundos...");
        await new Promise(r => setTimeout(r, 5000));
    } catch (e) {
        console.error("Error en el test:", e);
    } finally {
        await browser.close();
        console.log("Test finalizado.");
    }
}

runTest();
