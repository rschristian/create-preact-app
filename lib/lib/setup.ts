import spawn from 'cross-spawn-promise';
import { error, hasCommand } from '../util';

export async function install(cwd: string, packageManager: 'yarn' | 'npm'): Promise<void> {
    if (!hasCommand(packageManager)) error(`${packageManager} cannot be found`);
    await spawn(packageManager, ['install'], { cwd, stdio: 'inherit' });
}

export async function initGit(cwd: string): Promise<void> {
    if (!hasCommand('git')) error('git cannot be found');
    await spawn('git', ['init'], { cwd });
}
