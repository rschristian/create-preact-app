import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import { resolve, join } from 'path';

// @ts-ignore
import gittar from 'gittar';
import { green } from 'kleur/colors';

import { copyTemplateFile, info, initGit, install, error, warn } from '../util';

type Argv = {
    template: string;
    dest: string;
    name: string;
    cwd: string;
    install: boolean;
    git: boolean;
    verbose: boolean;
};

export async function command(template: string, dest: string, argv: Argv): Promise<void> {
    const cwd = resolve(argv.cwd);
    const target = resolve(cwd, dest);
    const packageManager = /yarn/.test(process.env.npm_execpath || '') ? 'yarn' : 'npm';

    try {
		if ((await stat(target)).isDirectory()) {
			error(
				'Refusing to overwrite current directory! Please specify a different destination.',
				1
			);
		}
	} catch {}

    // Use `--name` value or `dest` dir's name
    argv.name = argv.name || dest;

    if (!template.includes('/')) {
        template = `preactjs-templates/${template}`;
        info(`Assuming you meant ${template}...`);
    }

    await mkdir(resolve(cwd, dest, 'src'), { recursive: true });

    // Attempt to fetch the template
	let archive = await gittar.fetch(template).catch((err: any) => {
		err = err || { message: 'An error occured while fetching template.' };

		return error(
			err.code === 404
				? `Could not find repository: ${template}`
				: (argv.verbose && err.stack) || err.message,
			1
		);
	});

    // Extract files from `archive` to `target`
	// TODO: read & respond to meta/hooks
	let hasValidStructure = false;
	await gittar.extract(archive, target, {
		strip: 2,
		filter(path: string) {
			if (path.includes('/template/')) {
				hasValidStructure = true;
				return true;
			}
		},
	});

	if (!hasValidStructure) {
		error(
			`No 'template' directory found within ${template}! This is necessary for project creation.`,
			1
		);
	}

    // Rewrite manifest & package.json
    try {
		const manifestPath = join(target, 'src', 'manifest.json');

		let manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
		manifest.name = manifest.short_name = argv.name;

		await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
		if (argv.name.length > 12) {
			// @see https://developer.chrome.com/extensions/manifest/name#short_name
			warn('Your `short_name` should be fewer than 12 characters.');
		}

        const packagePath = join(target, 'package.json');

		let packageJson = await readFile(packagePath, 'utf-8');

        packageJson = packageJson
            .replace(/"dev.*\n/, '"serve:dev": "preact watch -p 3000",\n')
            .replace(/"serve.*\n/, '"serve:prod": "sirv build -p 3000 --cors --single",\n')
            .replace(/"name.*\n/, '');

		await writeFile(packagePath, packageJson);
	} catch {}

    if (!template.includes('widget')) {
		const sourceDirectory = join(resolve(cwd, dest), 'src');

		// Copy over template.html
		const templateSrc = resolve(
			__dirname,
			join('resources', 'template.html')
		);
		const templateDest = join(sourceDirectory, 'template.html');
		await copyTemplateFile(templateSrc, templateDest);

		// Copy over sw.js
		const serviceWorkerSrc = resolve(
			__dirname,
			join('resources', 'sw.js')
		);
		const serviceWorkerDest = join(sourceDirectory, 'sw.js');
		await copyTemplateFile(serviceWorkerSrc, serviceWorkerDest);
	}

    if (argv.install) await install(target, packageManager);
    if (argv.git) await initGit(target);

    const pfx = packageManager === 'yarn' ? 'yarn' : 'npm run';

    const result = `
		To get started, cd into the new directory:
		  ${green('cd ' + dest)}
		To start a development live-reload server:
		  ${green(pfx + ' dev')}
		To create a production build (in ./build):
		  ${green(pfx + ' build')}
		To start a production HTTP/2 server:
		  ${green(pfx + ' serve')}
	`;
	process.stdout.write(result.trim().replace(/^\t+/gm, '') + '\n\n');
}
