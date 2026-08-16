'use strict';

const { describe, test, expect } = require('bun:test');
const {
    esFalsoPositivo,
    normalizarLista,
    compararListas,
    tipoDeArchivo,
    formatearDiferencia,
    formatearResumenDiferencia,
    listasDesdeTexto,
} = require('./comparador-lib');

describe('tipoDeArchivo', () => {
    test('detecta seguidores antes que seguidos', () => {
        expect(tipoDeArchivo('seguidores1Javi.txt')).toBe('seguidores');
        expect(tipoDeArchivo('seguidos1Javi.txt')).toBe('seguidos');
        expect(tipoDeArchivo('lista.txt')).toBe(null);
    });

    test('es case insensitive y exige .txt', () => {
        expect(tipoDeArchivo('SEGUIDORES1.TXT')).toBe('seguidores');
        expect(tipoDeArchivo('Seguidos2.csv')).toBe(null);
        expect(tipoDeArchivo('seguidores')).toBe(null);
    });
});

describe('normalizarLista', () => {
    test('omite lineas vacias y fonsi.100', () => {
        const lista = normalizarLista('ana_dev\n\nfonsi.100\npedrodev\n');
        expect(lista).toEqual(['ana_dev', 'pedrodev']);
    });

    test('esFalsoPositivo es case insensitive', () => {
        expect(esFalsoPositivo('Fonsi.100')).toBe(true);
        expect(esFalsoPositivo('pepito')).toBe(false);
    });

    test('recorta espacios y conserva orden', () => {
        expect(normalizarLista('  ana  \n  pedro  \n')).toEqual(['ana', 'pedro']);
    });
});

describe('compararListas', () => {
    test('encuentra usuarios en base que no estan en comparacion', () => {
        const { base, comparacion } = listasDesdeTexto(
            'ana_dev\ncarlosmusic\njavifit\nluciaarte\npedrodev\n',
            'ana_dev\njavifit\nluciaarte\npedrodev\n'
        );

        const diff = compararListas(base, comparacion);
        expect(diff).toEqual(['carlosmusic']);
    });

    test('devuelve lista vacia si no hay bajas', () => {
        const { base, comparacion } = listasDesdeTexto('a\nb\n', 'a\nb\nc\n');
        expect(compararListas(base, comparacion)).toEqual([]);
    });

    test('deduplica unicos en base', () => {
        const { base, comparacion } = listasDesdeTexto('a\na\nb\n', 'a\n');
        expect(compararListas(base, comparacion)).toEqual(['b']);
        expect(base.total).toBe(3);
        expect(base.unicos.length).toBe(2);
    });
});

describe('formatearResumenDiferencia', () => {
    test('resume bajada de totales', () => {
        expect(formatearResumenDiferencia(357, 356, 1)).toBe('Baja de 357 a 356: (-1)');
    });

    test('resume subida de totales con bajas listadas', () => {
        expect(formatearResumenDiferencia(10, 12, 1)).toBe('Sube de 10 a 12: (-1)');
    });

    test('si no hay bajas listadas, dice sin diferencias aunque cambien totales', () => {
        expect(formatearResumenDiferencia(10, 12, 0)).toBe('Sin Diferencias. 10 = 12: (0)');
    });

    test('resume sin diferencias', () => {
        expect(formatearResumenDiferencia(10, 10, 0)).toBe('Sin Diferencias. 10 = 10: (0)');
    });

    test('formatearDiferencia', () => {
        expect(formatearDiferencia(0)).toBe('(0)');
        expect(formatearDiferencia(2)).toBe('(-2)');
    });
});
