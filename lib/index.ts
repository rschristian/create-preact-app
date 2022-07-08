#!/usr/bin/env node
// @ts-ignore
import sade from 'sade';
import { error } from './util';
import { command as create } from './commands/create';
import { command as list } from './commands/create';

const prog = sade('create-preact-app').version('0.1.3');

prog
    .command('create <template> <dest>', '', { default: true })
    .describe('Create a new application')
    .option('--name', 'The application name')
    .option('--cwd', 'A directory to use instead of $PWD', '.')
    .option('--install', 'Install dependencies', true)
    .option('--git', 'Initialize git repository', true)
    .option('--verbose', 'Verbose output', false)
    .action(create);

prog
    .command('list')
    .describe('List official templates')
    .action(list);

prog.parse(process.argv, {
    unknown: (arg: string) => {
		const cmd = process.argv[2];
		error(
			`Invalid argument '${arg}' passed to ${cmd}. Please refer to 'preact ${cmd} --help' for the full list of options.\n`
		);
	},
});
