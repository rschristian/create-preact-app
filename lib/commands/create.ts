import { promisify } from 'util';
import { glob } from 'glob';
// @ts-ignore
import gittar from 'gittar';
import { existsSync, mkdirSync } from 'fs';
import { copyFile, readFile, writeFile } from 'fs/promises';
import { green } from 'kleur/colors';
import { resolve, join } from 'path';
import isValidName from 'validate-npm-package-name';
import { info, isDir, error, trim, warn } from '../util';
import { install, initGit } from '../lib/setup';
import { ArgvOption, validateArgs } from './validateArgs';
import { ORG } from '../constants';

const globPromise = promisify(glob);

const RGX = /\.(woff2?|ttf|eot|jpe?g|ico|png|gif|webp|mp4|mov|ogg|webm)(\?.*)?$/i;
const isMedia = (str: string) => RGX.test(str);
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.substring(1);

export const options: ArgvOption[] = [
    {
        name: '--name',
        description: 'The application name',
    },
    {
        name: '--cwd',
        description: 'A directory to use instead of $PWD',
        default: '.',
    },
    {
        name: '--install',
        description: 'Install dependencies',
        default: true,
    },
    {
        name: '--git',
        description: 'Initialize git repository',
        default: true,
    },
    {
        name: '-v, --verbose',
        description: 'Verbose output',
        default: false,
    },
];

type Argv = {
    template: string;
    dest: string;
    name: string;
    cwd: string;
    install: boolean;
    git: boolean;
    verbose: boolean;
};

async function copyFileToDestination(srcPath: string, destPath: string, force = false) {
    if (!existsSync(destPath) || force) await copyFile(srcPath, destPath);
}

export async function command(template: string, dest: string, argv: Argv): Promise<void> {
    validateArgs(argv, options, 'create');

    if (!template || !dest) {
        warn('Insufficient arguments!');
        info('Alternatively, run `preact create --help` for usage info.');
        return;
    }

    const cwd = resolve(argv.cwd);
    const target = resolve(cwd, dest);
    const packageManager = /yarn/.test(process.env.npm_execpath || '') ? 'yarn' : 'npm';
    const exists = isDir(target);

    if (exists) {
        return error('Refusing to overwrite current directory! Please specify a different destination.', 1);
    }

    // Use `--name` value or `dest` dir's name
    argv.name = argv.name || dest;

    const { errors } = isValidName(argv.name);
    if (errors) {
        errors.unshift(`Invalid package name: ${argv.name}`);
        return error(errors.map(capitalize).join('\n  ~ '), 1);
    }

    if (!template.includes('/')) {
        template = `${ORG}/${template}`;
        info(`Assuming you meant ${template}...`);
    }

    if (!existsSync(resolve(cwd, dest, 'src'))) mkdirSync(resolve(cwd, dest, 'src'), { recursive: true });

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
        dict.set(templateVar('pkg-run'), packageManager === 'yarn' ? 'yarn' : 'npm run');
        dict.set(templateVar('pkg-add'), packageManager === 'yarn' ? 'yarn add' : 'npm install');
        dict.set(templateVar('now-year'), new Date().getFullYear());

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

    // Validate user's `package.json` file
    let pkgData;
    const pkgFile = resolve(target, 'package.json');

    if (pkgFile) pkgData = JSON.parse((await readFile(pkgFile)).toString());
    else warn('Could not locate `package.json` file!');

    // Update `package.json` key
    if (pkgData) pkgData.name = argv.name.toLowerCase().replace(/\s+/g, '_');

    // Find a `manifest.json`; use the first match, if any
    const files = await globPromise(`${target}/**/manifest.json`);
    const manifest = files[0] && JSON.parse((await readFile(files[0])).toString());
    if (manifest) {
        manifest.name = manifest.short_name = argv.name;
        // Write changes to `manifest.json`
        await writeFile(files[0], JSON.stringify(manifest, null, 2));
        if (argv.name.length > 12) {
            // @see https://developer.chrome.com/extensions/manifest/name#short_name
            process.stdout.write('\n');
            warn('Your `short_name` should be fewer than 12 characters.');
        }
    }

    if (pkgData) {
        // Assume changes were made ¯\_(ツ)_/¯
        await writeFile(pkgFile, JSON.stringify(pkgData, null, 2));
    }

    const sourceDirectory = join(resolve(cwd, dest), 'src');

    // Copy over template.html
    if (!template.includes('widget')) {
        const templateSrc = resolve(__dirname, join('resources', 'template.html'));
        const templateDest = join(sourceDirectory, 'template.html');
        await copyFileToDestination(templateSrc, templateDest);
    }

    // Copy over sw.js
    if (!template.includes('widget')) {
        const serviceWorkerSrc = resolve(__dirname, join('resources', 'sw.js'));
        const serviceWorkerDest = join(sourceDirectory, 'sw.js');
        await copyFileToDestination(serviceWorkerSrc, serviceWorkerDest);
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
