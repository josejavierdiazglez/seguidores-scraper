#!/usr/bin/env bun

'use strict';

require('./enforce-bun');

const fs = require('fs/promises');
const path = require('path');
const readline = require('readline/promises');
const { stdin: input, stdout: output } = require('process');
const {
    normalizarLista,
    compararListas,
    tipoDeArchivo,
    formatearResumenDiferencia,
} = require('./comparador-lib');

function formatarRuta(ruta) {
    return path.normalize(ruta);
}

async function leerLista(ruta) {
    const contenido = await fs.readFile(ruta, 'utf8');
    const lineas = normalizarLista(contenido);

    return {
        ruta,
        total: lineas.length,
        unicos: Array.from(new Set(lineas)),
    };
}

function formatearListaNumerada(lista) {
    return lista.map((nombre, indice) => `${indice + 1}. ${nombre}`).join('\n');
}

async function listarDirectorios(basePath) {
    const entries = await fs.readdir(basePath, { withFileTypes: true });
    return entries
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => entry.name)
        .sort((a, b) => a.localeCompare(b, 'es'));
}

async function listarTxtsPorTipo(carpeta, tipo) {
    const entries = await fs.readdir(carpeta, { withFileTypes: true });
    return entries
        .filter(entry => entry.isFile() && tipoDeArchivo(entry.name) === tipo)
        .map(entry => entry.name)
        .sort((a, b) => a.localeCompare(b, 'es'));
}

function imprimirOpciones(opciones) {
    return opciones.map((opcion, indice) => `${indice + 1}. ${opcion}`).join('\n');
}

async function preguntarIndiceValido(rl, mensaje, totalOpciones, indiceBloqueado = null) {
    while (true) {
        const respuesta = (await rl.question(mensaje)).trim();
        const numero = Number(respuesta);

        if (!Number.isInteger(numero) || numero < 1 || numero > totalOpciones) {
            console.log(`Seleccion invalida. Escribe un numero entre 1 y ${totalOpciones}.`);
            continue;
        }

        const indice = numero - 1;
        if (indiceBloqueado !== null && indice === indiceBloqueado) {
            console.log('Debes elegir un archivo distinto al archivo base.');
            continue;
        }

        return indice;
    }
}

async function seleccionarArchivosPorTipo(rl, rutaCuenta, tipo) {
    const archivos = await listarTxtsPorTipo(rutaCuenta, tipo);

    if (archivos.length < 2) {
        throw new Error(
            `En ${formatarRuta(rutaCuenta)} se necesitan al menos 2 archivos .txt de ${tipo} ` +
            `(nombre que empiece por «${tipo}»).`
        );
    }

    console.log('');
    console.log(`Archivos disponibles de ${tipo}:`);
    console.log(imprimirOpciones(archivos));

    const indiceBase = await preguntarIndiceValido(
        rl,
        `Selecciona el archivo grande/base de ${tipo} (numero): `,
        archivos.length
    );

    const indiceComparacion = await preguntarIndiceValido(
        rl,
        `Selecciona el archivo a comparar de ${tipo} (numero): `,
        archivos.length,
        indiceBase
    );

    return {
        base: path.join(rutaCuenta, archivos[indiceBase]),
        comparacion: path.join(rutaCuenta, archivos[indiceComparacion]),
    };
}

async function main() {
    const raizscraper = path.join(__dirname, '..', 'scraper');

    try {
        await fs.access(raizscraper);
    } catch {
        throw new Error(`No existe la carpeta scraper en ${formatarRuta(__dirname)}.`);
    }

    const cuentas = await listarDirectorios(raizscraper);

    if (!cuentas.length) {
        throw new Error(`No hay carpetas de cuentas dentro de ${formatarRuta(raizscraper)}.`);
    }

    const rl = readline.createInterface({ input, output });

    try {
        console.log('=== Comparador de seguidores/seguidos ===');
        console.log('');
        console.log('Carpetas disponibles:');
        console.log(imprimirOpciones(cuentas));

        const indiceCuenta = await preguntarIndiceValido(
            rl,
            'Selecciona la carpeta de cuenta (numero): ',
            cuentas.length
        );

        const cuenta = cuentas[indiceCuenta];
        const rutaCuenta = path.join(raizscraper, cuenta);

        const seleccionSeguidores = await seleccionarArchivosPorTipo(rl, rutaCuenta, 'seguidores');
        const seleccionSeguidos = await seleccionarArchivosPorTipo(rl, rutaCuenta, 'seguidos');

        const [
            listaSeguidoresBase,
            listaSeguidoresComparacion,
            listaSeguidosBase,
            listaSeguidosComparacion,
        ] = await Promise.all([
            leerLista(seleccionSeguidores.base),
            leerLista(seleccionSeguidores.comparacion),
            leerLista(seleccionSeguidos.base),
            leerLista(seleccionSeguidos.comparacion),
        ]);

        const seguidoresNoEnComparacion = compararListas(listaSeguidoresBase, listaSeguidoresComparacion);
        const seguidosNoEnComparacion = compararListas(listaSeguidosBase, listaSeguidosComparacion);

        console.log('');
        console.log('=== Resultado seguidores ===');
        console.log('Base:', listaSeguidoresBase.total);
        console.log('Comparacion:', listaSeguidoresComparacion.total);
        console.log(formatearResumenDiferencia(
            listaSeguidoresBase.total,
            listaSeguidoresComparacion.total,
            seguidoresNoEnComparacion.length
        ));
        if (seguidoresNoEnComparacion.length) {
            console.log(formatearListaNumerada(seguidoresNoEnComparacion));
        }

        console.log('');
        console.log('=== Resultado seguidos ===');
        console.log('Base:', listaSeguidosBase.total);
        console.log('Comparacion:', listaSeguidosComparacion.total);
        console.log(formatearResumenDiferencia(
            listaSeguidosBase.total,
            listaSeguidosComparacion.total,
            seguidosNoEnComparacion.length
        ));
        if (seguidosNoEnComparacion.length) {
            console.log(formatearListaNumerada(seguidosNoEnComparacion));
        }
    } finally {
        rl.close();
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('Error al comparar archivos:', error.message);
        process.exitCode = 1;
    });
}
