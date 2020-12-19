import { promisify } from 'util';
import { glob } from 'glob';
// @ts-ignore
import gittar from 'gittar';
import os from 'os';
import { existsSync, mkdirSync } from 'fs';
import { copyFile, mkdir, readFile, writeFile } from 'fs/promises';
import { green } from 'kleur/colors';
import { resolve, join } from 'path';
import { prompt } from 'prompts';
import isValidName from 'validate-npm-package-name';
import {
    info,
    isDir,
    error,
    trim,
    warn,
    dirExists,
    normalizeTemplatesResponse,
    templateInfo,
    ProcessedRepo,
} from '../util';
import { install, initGit } from '../lib/setup';
import { ArgvOption, validateArgs } from './validateArgs';
import {
    CUSTOM_TEMPLATE,
    FALLBACK_TEMPLATE_OPTIONS,
    ORG,
    TEMPLATES_CACHE_FILENAME,
    TEMPLATES_CACHE_FOLDER,
} from '../constants';

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
        name: '--force',
        description: 'Force destination output; will override!',
        default: false,
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
    force: boolean;
    install: boolean;
    git: boolean;
    verbose: boolean;
};

// Formulate Questions if `create` args are missing
function requestParams(argv: Argv, templates: ProcessedRepo[]) {
    const cwd = resolve(argv.cwd);

    return [
        {
            type: argv.template ? null : 'select',
            name: 'template',
            message: 'Pick a template',
            choices: templates,
            initial: 0,
        },
        {
            type: (prev: string) => (prev === 'custom' ? 'text' : null),
            name: 'template',
            message: 'Remote template to clone (user/repo#tag)',
        },
        {
            type: argv.dest ? null : 'text',
            name: 'dest',
            message: 'Directory to create the app',
        },
        {
            type: (prev: string) => (!dirExists(cwd, prev || argv.dest) ? null : 'confirm'),
            name: 'force',
            message: 'The destination directory exists. Overwrite?',
            initial: false,
            onState: (state: { value: string; aborted: boolean }) => {
                if (state.aborted || !state.value) {
                    process.stdout.write('\n');
                    warn('Aborting due to existing directory');
                    process.exit();
                }
            },
        },
        {
            type: argv.name ? null : 'text',
            name: 'name',
            message: 'The name of your application',
        },
        {
            type: 'confirm',
            name: 'install',
            message: 'Install dependencies',
            initial: true,
        },
        {
            type: argv.git ? null : 'confirm',
            name: 'git',
            message: 'Initialize a `git` repository',
            initial: false,
        },
    ];
}

async function updateTemplatesCache() {
    const cacheFilePath = join(os.homedir(), TEMPLATES_CACHE_FOLDER, TEMPLATES_CACHE_FILENAME);
    try {
        const repos = await templateInfo();
        await writeFile(cacheFilePath, JSON.stringify(repos, null, 2), 'utf-8');
    } catch (err) {
        error(`\nFailed to update template cache\n ${err}`);
    }
}

async function fetchTemplates() {
    let templates = [];
    const cacheFolder = join(os.homedir(), TEMPLATES_CACHE_FOLDER);
    const cacheFilePath = join(os.homedir(), TEMPLATES_CACHE_FOLDER, TEMPLATES_CACHE_FILENAME);

    try {
        // fetch the repos list from the github API
        info('Fetching official templates:\n');

        // check if `.cache` folder exists or not, and create if does not exists
        if (!existsSync(cacheFolder)) await mkdir(cacheFolder);

        // If cache file doesn't exist, then hit the API and fetch the data
        if (!existsSync(cacheFilePath)) {
            const repos = await templateInfo();
            await writeFile(cacheFilePath, JSON.stringify(repos, null, 2), 'utf-8');
        }

        // update the cache file without blocking the rest of the tasks.
        await updateTemplatesCache();

        // fetch the API response from cache file
        const templatesFromCache = await readFile(cacheFilePath, 'utf-8');
        const parsedTemplates = JSON.parse(templatesFromCache);
        const officialTemplates = normalizeTemplatesResponse(parsedTemplates || []);

        templates = officialTemplates.concat(CUSTOM_TEMPLATE);
    } catch (e) {
        // in case github API fails to fetch the data, fallback to the hard coded listings
        templates = FALLBACK_TEMPLATE_OPTIONS.concat(CUSTOM_TEMPLATE);
    }

    return templates;
}

async function copyFileToDestination(srcPath: string, destPath: string, force = false) {
    if (!existsSync(destPath) || force) await copyFile(srcPath, destPath);
}

export async function command(template: string, dest: string, argv: Argv): Promise<void> {
    validateArgs(argv, options, 'create');
    // Prompt if incomplete data
    if (!template || !dest) {
        const templates = await fetchTemplates();
        const questions = requestParams(argv, templates);
        const onCancel = () => {
            info('Aborting execution');
            process.exit();
        };
        const response = await prompt(questions, { onCancel });

        Object.assign(argv, response);
        template = template || response.template;
        dest = dest || response.dest;
    }

    if (!template || !dest) {
        warn('Insufficient arguments!');
        info('Alternatively, run `preact create --help` for usage info.');
        return;
    }

    const cwd = resolve(argv.cwd);
    const target = resolve(cwd, dest);
    const packageManager = /yarn/.test(process.env.npm_execpath || '') ? 'yarn' : 'npm';
    const exists = isDir(target);

    if (exists && !argv.force) {
        return error(
            'Refusing to overwrite current directory! Please specify a different destination or use the `--force` flag',
            1,
        );
    }

    if (exists && argv.force) {
        const { enableForce } = await prompt({
            type: 'confirm',
            name: 'enableForce',
            message: "You are using '--force'. Do you wish to continue?",
            initial: false,
        });

        if (enableForce) {
            info('Initializing project in the current directory!');
        } else {
            return error('Refusing to overwrite current directory!', 1);
        }
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
