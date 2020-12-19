import { spawn } from 'child_process';
import { promisify } from 'util';
import { error, hasCommand } from '../util';

export async function install(cwd: string, packageManager: 'yarn' | 'npm'): Promise<void> {
    if (!hasCommand(packageManager)) error(`${packageManager} cannot be found`);
    await promisify(spawn)(packageManager, ['install'], { cwd, stdio: 'inherit' });
}

export async function initGit(cwd: string): Promise<void> {
    if (!hasCommand('git')) error('git cannot be found');
    await promisify(spawn)('git', ['init'], { cwd });
}
