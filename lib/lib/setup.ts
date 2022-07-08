import spawn from 'cross-spawn-promise';

export async function install(cwd: string, packageManager: 'yarn' | 'npm'): Promise<void> {
    await spawn(packageManager, ['install'], { cwd, stdio: 'inherit' });
}

export async function initGit(cwd: string): Promise<void> {
    await spawn('git', ['init'], { cwd });
}
