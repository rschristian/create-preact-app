import { copyFile, mkdir, readFile, writeFile } from 'fs/promises';
import { resolve, join } from 'path';

// @ts-ignore
import gittar from 'gittar';
import { green } from 'kleur/colors';

import { info, isDir, error, trim, warn } from '../util';
import { install, initGit } from '../lib/setup';

const RGX = /\.(woff2?|ttf|eot|jpe?g|ico|png|gif|webp|mp4|mov|ogg|webm)(\?.*)?$/i;
const isMedia = (str: string) => RGX.test(str);

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
    const exists = isDir(target);

    if (exists) {
        return error('Refusing to overwrite current directory! Please specify a different destination.', 1);
    }

    // Use `--name` value or `dest` dir's name
    argv.name = argv.name || dest;

    if (!template.includes('/')) {
        template = `preactjs-templates/${template}`;
        info(`Assuming you meant ${template}...`);
    }

    await mkdir(resolve(cwd, dest, 'src'), { recursive: true });

    // Attempt to fetch the `template`
    const archive = await gittar.fetch(template).catch((err: any) => {
        err = err || { message: 'An error occurred while fetching template.' };

        return error(
            err.code === 404 ? `Could not find repository: ${template}` : (argv.verbose && err.stack) || err.message,
            1,
        );
    });

    // Extract files from `archive` to `target`
    // TODO: read & respond to meta/hooks
    const keeps: string[] = [];
    await gittar.extract(archive, target, {
        strip: 2,
        filter(path: string, obj: any) {
            if (path.includes('/template/')) {
                obj.on('end', () => {
                    if (obj.type === 'File' && !isMedia(obj.path)) {
                        keeps.push(obj.absolute);
                    }
                });
                return true;
            }
        },
    });

    if (keeps.length) {
        const dict = new Map();
        const templateVar = (str: string) => new RegExp(`{{\\s?${str}\\s}}`, 'g');

        dict.set(templateVar('pkg-install'), packageManager === 'yarn' ? 'yarn' : 'npm install');

        if (argv.name !== void 0) dict.set(templateVar('name'), argv.name);

        // Update each file's contents
        let buf: string;
        const enc = 'utf8';
        for (const entry of keeps) {
            buf = await readFile(entry, enc);
            dict.forEach((v, k) => {
                buf = buf.replace(k, v);
            });
            await writeFile(entry, buf, enc);
        }
    } else {
        return error(`No \`template\` directory found within ${template}!`, 1);
    }

    const sourceDirectory = join(resolve(cwd, dest), 'src');

    // Copy over template.html
    if (!template.includes('widget')) {
        const templateSrc = resolve(__dirname, join('resources', 'template.html'));
        const templateDest = join(sourceDirectory, 'template.html');
        await copyFile(templateSrc, templateDest);
    }

    // Copy over sw.js
    if (!template.includes('widget')) {
        const serviceWorkerSrc = resolve(__dirname, join('resources', 'sw.js'));
        const serviceWorkerDest = join(sourceDirectory, 'sw.js');
        await copyFile(serviceWorkerSrc, serviceWorkerDest);
    }

    if (argv.install) await install(target, packageManager);
    if (argv.git) await initGit(target);

    const pfx = packageManager === 'yarn' ? 'yarn' : 'npm run';

    process.stdout.write(
        `\n${trim(`
		To get started, cd into the new directory:
		  ${green(`cd ${dest}`)}

		To start a development live-reload server:
		  ${green(`${pfx} dev`)}

		To create a production build (in ./build):
		  ${green(`${pfx} build`)}

		To start a production HTTP/2 server:
		  ${green(`${pfx} serve`)}
	`)}\n\n`,
    );
}
