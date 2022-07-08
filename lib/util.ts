import { statSync, existsSync } from 'fs';

import { blue, yellow, red } from 'kleur/colors';
import fetch from 'isomorphic-unfetch';

const symbols = {
    info: blue('ℹ'),
    warning: yellow('⚠'),
    error: red('✖'),
};

export function isDir(str: string): boolean {
    return existsSync(str) && statSync(str).isDirectory();
}

export async function templateInfo(): Promise<UnprocessedRepo[]> {
    return await fetch('https://api.github.com/users/preactjs-templates/repos').then((r) => r.json());
}

export function trim(str: string): string {
    return str.trim().replace(/^\t+/gm, '');
}

export function info(text: string, code?: number): void {
    process.stdout.write(`${symbols.info + blue(' INFO ') + text}\n`);
    code && process.exit(code);
}

export function warn(text: string, code?: number): void {
    process.stdout.write(`${symbols.warning + yellow(' WARN ') + text}\n`);
    code && process.exit(code);
}

export function error(text: string, code = 1): void {
    process.stderr.write(`${symbols.error + red(' ERROR ') + text}\n`);
    code && process.exit(code);
}

type UnprocessedRepo = {
    name: string;
    full_name: string;
    description: string;
    archived: boolean;
};

export type ProcessedRepo = {
    title: string;
    value: string;
    description: string;
};
