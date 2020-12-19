import { blue, yellow, red } from 'kleur/colors';
import { normalize, resolve } from 'path';
import { statSync, existsSync } from 'fs';
import fetch from 'isomorphic-unfetch';
// @ts-ignore
import which from 'which';
import { TEMPLATES_REPO_URL } from './constants';

const symbols = {
    info: blue('ℹ'),
    warning: yellow('⚠'),
    error: red('✖'),
};

export function isDir(str: string): boolean {
    return existsSync(str) && statSync(str).isDirectory();
}

export function dirExists(workingDir: string, destDir: string): boolean {
    return isDir(resolve(workingDir, destDir));
}

export async function templateInfo(): Promise<UnprocessedRepo[]> {
    return await fetch(TEMPLATES_REPO_URL).then((r) => r.json());
}

export function hasCommand(str: string): boolean {
    return !!which.sync(str, { nothrow: true });
}

export function trim(str: string): string {
    return str.trim().replace(/^\t+/gm, '');
}

export function info(text: string, code?: number): void {
    process.stderr.write(`${symbols.info + blue(' INFO ') + text}\n`);
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

export function normalizePath(str: string): string {
    return normalize(str).replace(/\\/g, '/');
}

type UnprocessedRepo = {
    name: string;
    full_name: string;
    description: string;
};

export type ProcessedRepo = {
    title: string;
    value: string;
    description: string;
};

export function normalizeTemplatesResponse(repos: UnprocessedRepo[] = []): ProcessedRepo[] {
    return repos.map((repo) => ({
        title: repo.name || '',
        value: repo.full_name || '',
        description: repo.description || '',
    }));
}
