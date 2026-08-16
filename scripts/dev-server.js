#!/usr/bin/env bun
'use strict';

/**
 * Sirve public/ en localhost y abre el hub (index.html).
 * Expone /package.json real del proyecto (campo version).
 *
 *   bun start
 *   bun run dev
 */

require('./enforce-bun');

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const port = Number(process.env.PORT) || 4173;
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const pkgPath = path.join(root, 'package.json');
const url = `http://localhost:${port}/`;

const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.txt': 'text/plain; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
};

function abrirNavegador(destino) {
    let comando;
    let args;

    if (process.platform === 'win32') {
        comando = 'cmd';
        args = ['/c', 'start', '', destino];
    } else if (process.platform === 'darwin') {
        comando = 'open';
        args = [destino];
    } else if (fs.existsSync('/mnt/c/Windows/System32/cmd.exe')) {
        comando = '/mnt/c/Windows/System32/cmd.exe';
        args = ['/c', 'start', '', destino];
    } else {
        comando = 'xdg-open';
        args = [destino];
    }

    spawn(comando, args, { stdio: 'ignore', detached: true }).unref();
}

const server = http.createServer((req, res) => {
    const parsed = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    let pathname = decodeURIComponent(parsed.pathname);

    if (pathname === '/package.json') {
        fs.readFile(pkgPath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('No se pudo leer package.json');
                return;
            }
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store',
            });
            res.end(data);
        });
        return;
    }

    if (pathname.endsWith('/')) {
        pathname += 'index.html';
    }

    const filePath = path.resolve(publicDir, '.' + pathname);
    if (!filePath.startsWith(publicDir + path.sep) && filePath !== publicDir) {
        res.writeHead(403).end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
            return;
        }
        res.writeHead(200, {
            'Content-Type': mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-store',
        });
        res.end(data);
    });
});

server.listen(port, '127.0.0.1', () => {
    console.log(`Serving ${path.relative(root, publicDir)} at ${url}`);
    console.log(`Abriendo ${url}`);
    try {
        abrirNavegador(url);
    } catch (error) {
        console.warn('No se pudo abrir el navegador:', error.message || error);
    }
});

process.on('SIGINT', () => {
    server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
});
