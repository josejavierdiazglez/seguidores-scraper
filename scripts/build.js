#!/usr/bin/env bun
'use strict';

/**
 * Minifica el extractor (extraer) con Terser y embebe otros/comparar-minified.js (comparar) en GitHub Pages.
 *
 *   bun run build
 *   bun scripts/build.js otros/otro-archivo.js
 */

require('./enforce-bun');

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const defaultSource = path.join(root, 'otros', 'seguidores-seguidos-scraper_completo.js');
const compararSource = path.join(root, 'otros', 'comparar-minified.js');
const cachePath = path.join(root, 'dist', 'dist.js');
const extraerIndexPath = path.join(root, 'public', 'extraer', 'index.html');
const compararIndexPath = path.join(root, 'public', 'comparar', 'index.html');
const bundleScriptId = 'extractor-code';

function rutaTerser() {
    const bin = process.platform === 'win32' ? 'terser.cmd' : 'terser';
    const local = path.join(root, 'node_modules', '.bin', bin);
    if (fs.existsSync(local)) {
        return local;
    }
    return null;
}

function minificarConTerser(fuentePath) {
    const terser = rutaTerser();
    const archivo = path.resolve(fuentePath);

    let salida;
    if (terser) {
        salida = execSync(`"${terser}" "${archivo}" -c -m`, {
            encoding: 'utf8',
            cwd: root,
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
        });
    } else {
        salida = execSync(`bunx terser "${archivo}" -c -m`, {
            encoding: 'utf8',
            cwd: root,
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
        });
    }

    return salida.trim();
}

function validarSintaxis(codigo) {
    try {
        // Validación de parseo sin depender de Node.
        new Function(codigo);
    } catch (error) {
        throw new Error('Sintaxis invalida: ' + (error.message || error));
    }
}

function validarEstructuraIife(codigo) {
    const fin = codigo.slice(-12);
    if (!/^\(\(\)|^\(function/.test(codigo)) {
        throw new Error('El minificado no empieza con IIFE ((function o (() =>).');
    }
    if (!fin.includes(')();') && !fin.endsWith('})()')) {
        throw new Error('El minificado no termina como IIFE invocable ()();');
    }
}

function leerBundleEmbebido(indexPath) {
    if (!fs.existsSync(indexPath)) {
        return null;
    }
    const html = fs.readFileSync(indexPath, 'utf8');
    const startTag = `<script id="${bundleScriptId}" type="application/json">`;
    const start = html.indexOf(startTag);
    if (start === -1) {
        return null;
    }
    const contentStart = start + startTag.length;
    const end = html.indexOf('</script>', contentStart);
    if (end === -1) {
        return null;
    }
    try {
        const parsed = JSON.parse(html.slice(contentStart, end));
        return typeof parsed === 'string' && parsed.length > 0 ? parsed : null;
    } catch {
        return null;
    }
}

function embeberEnIndexHtml(indexPath, minificado) {
    const html = fs.readFileSync(indexPath, 'utf8');
    const startTag = `<script id="${bundleScriptId}" type="application/json">`;
    const start = html.indexOf(startTag);

    if (start === -1) {
        console.error(`No se encontró <script id="${bundleScriptId}"> en ${path.relative(root, indexPath)}.`);
        process.exit(1);
    }

    const contentStart = start + startTag.length;
    const end = html.indexOf('</script>', contentStart);

    if (end === -1) {
        console.error('Cierre </script> del bundle no encontrado.');
        process.exit(1);
    }

    const payload = JSON.stringify(minificado).replace(/</g, '\\u003c');
    const actualizado = html.slice(0, contentStart) + payload + html.slice(end);

    fs.writeFileSync(indexPath, actualizado, 'utf8');
}

function resolverMinificadoExtraer() {
    const fuenteArg = process.argv[2];
    const fuentePath = fuenteArg
        ? path.isAbsolute(fuenteArg)
            ? fuenteArg
            : path.join(root, fuenteArg)
        : defaultSource;

    if (fs.existsSync(fuentePath)) {
        console.log('Extraer: Terser →', path.relative(root, fuentePath));
        const minificado = minificarConTerser(fuentePath);
        validarEstructuraIife(minificado);
        validarSintaxis(minificado);
        return minificado;
    }

    const embebido = leerBundleEmbebido(extraerIndexPath);
    if (embebido) {
        console.log('Extraer: bundle ya en public/extraer/index.html (sin re-minificar)');
        console.warn('Pasa la ruta del .js en otros/ para regenerar con Terser.');
        return embebido;
    }

    console.error(
        'No hay fuente ni bundle para extraer.\n' +
            '  bun install\n' +
            '  bun run build\n' +
            'o: bun scripts/build.js otros/seguidores-seguidos-scraper_completo.js'
    );
    process.exit(1);
}

function resolverMinificadoComparar() {
    if (fs.existsSync(compararSource)) {
        console.log('Comparar: embeber →', path.relative(root, compararSource));
        const codigo = fs.readFileSync(compararSource, 'utf8').trim();
        validarSintaxis(codigo);
        return codigo;
    }

    const embebido = leerBundleEmbebido(compararIndexPath);
    if (embebido) {
        console.log('Comparar: bundle ya en public/comparar/index.html (sin otros/comparar-minified.js local)');
        console.warn('Coloca otros/comparar-minified.js para regenerar el bundle de comparar.');
        return embebido;
    }

    console.error(
        'No hay otros/comparar-minified.js ni bundle en public/comparar/index.html.\n' +
            '  Coloca el minificado en otros/comparar-minified.js y ejecuta bun run build'
    );
    process.exit(1);
}

function main() {
    if (!fs.existsSync(extraerIndexPath)) {
        console.error('Falta public/extraer/index.html');
        process.exit(1);
    }
    if (!fs.existsSync(compararIndexPath)) {
        console.error('Falta public/comparar/index.html');
        process.exit(1);
    }

    let minificadoExtraer;
    let minificadoComparar;
    try {
        minificadoExtraer = resolverMinificadoExtraer();
        minificadoComparar = resolverMinificadoComparar();
    } catch (error) {
        console.error('Error al preparar bundles:', error.message || error);
        console.error('Ejecuta: bun install   (instala terser local)');
        process.exit(1);
    }

    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, minificadoExtraer, 'utf8');
    embeberEnIndexHtml(extraerIndexPath, minificadoExtraer);
    embeberEnIndexHtml(compararIndexPath, minificadoComparar);

    console.log('Caché local (extraer):', path.relative(root, cachePath));
    console.log('Actualizado:', path.relative(root, extraerIndexPath));
    console.log('Actualizado:', path.relative(root, compararIndexPath));
    console.log('Tamaño extraer:', minificadoExtraer.length, 'caracteres');
    console.log('Tamaño comparar:', minificadoComparar.length, 'caracteres');
}

main();
