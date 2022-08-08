import { access, copyFile } from 'fs/promises';
import spawn from 'cross-spawn-promise';

import { blue, yellow, red } from 'kleur/colors';

const symbols = {
    info: blue('ℹ'),
    warning: yellow('⚠'),
    error: red('✖'),
};

export async function copyTemplateFile(srcPath: string, destPath: string) {
	try {
		await access(destPath);
	} catch {
		await copyFile(srcPath, destPath);
	}
};


export async function install(cwd: string, packageManager: 'yarn' | 'npm'): Promise<void> {
    await spawn(packageManager, ['install'], { cwd, stdio: 'inherit' });
}

export async function initGit(cwd: string): Promise<void> {
    await spawn('git', ['init'], { cwd });
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
