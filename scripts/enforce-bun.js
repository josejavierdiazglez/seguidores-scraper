#!/usr/bin/env bun
'use strict';

const MENSAJE =
    'Este proyecto solo admite Bun. Usa: bun install / bun run <script> / bun test';

const ua = process.env.npm_config_user_agent || '';
const esRuntimeBun = Boolean(process.versions && process.versions.bun);
const esAgenteBun = /\bbun\//i.test(ua);

if (!esRuntimeBun || (ua && !esAgenteBun)) {
    console.error(MENSAJE);
    process.exit(1);
}
