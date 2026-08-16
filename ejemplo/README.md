# Carpeta de ejemplo

Muestra cómo nombrar y organizar los `.txt` antes de usar el **analizador** o `bun run comparador`.

## Estructura

```text
ejemplo/
└── javi/
    ├── seguidores-base.txt
    ├── seguidores-comparacion.txt
    ├── seguidos-base.txt
    └── seguidos-comparacion.txt
```

En tu PC, replica la misma idea dentro de `scraper/<cuenta>/`:

```text
scraper/
└── javi/
    ├── seguidores1Javi.txt
    ├── seguidores2Javi.txt
    ├── seguidos1Javi.txt
    └── seguidos2Javi.txt
```

## Reglas de nombre

| Prefijo | Tipo | Ejemplo |
|---------|------|---------|
| `seguidores` | Lista de seguidores | `seguidores29JulioJorge.txt` |
| `seguidos` | Lista de seguidos | `seguidos3AgostoJorge.txt` |

- **base**: archivo antiguo o más grande (referencia).
- **comparación**: archivo nuevo a contrastar.

El comparador mira el **inicio del nombre** (`startsWith`): primero `seguidores`, luego `seguidos`. Usa siempre ese prefijo claro.

## Uso

- **Analizador (web):** sube los `.txt` y elige base y comparación.
- **Terminal:** `bun run comparador` lee los archivos de `scraper/<cuenta>/`.
