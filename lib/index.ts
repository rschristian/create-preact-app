#!/usr/bin/env node
// @ts-ignore
import sade from 'sade';
import { error } from './util';
import pkg from '../package.json';
import commands from './commands';

const ver = process.version;
const min = pkg.engines.node;
if (ver.substring(1).localeCompare(min.match(/\d+/g)!.join('.'), 'en', { numeric: true }) === -1) {
    error(`You are using Node ${ver} but create-preact-app requires Node ${min}. Please upgrade Node to continue!`, 1);
}

const prog = sade('create-preact-app').version(pkg.version);

const createCommand = prog
    .command('create [template] [dest]', '', { default: true })
    .describe('Create a new application');
commands.createOptions.forEach((option) => {
    createCommand.option(option.name, option.description, option.default);
});
createCommand.action(commands.create);

prog.command('list').describe('List official templates').action(commands.list);

prog.parse(process.argv);
