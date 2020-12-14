#!/usr/bin/env node
const sade = require('sade');
const { error } = require('./util');
const pkg = require('../package');

const ver = process.version;
const min = pkg.engines.node;
if (
    ver
        .substring(1)
        .localeCompare(min.match(/\d+/g).join('.'), 'en', { numeric: true }) === -1
) {
    return error(
        `You are using Node ${ver} but preact-cli requires Node ${min}. Please upgrade Node to continue!`,
        1
    );
}

// Safe to load async-based funcs
const commands = require('./commands');

process.on('unhandledRejection', err => {
    error(err.stack || err.message);
});

let prog = sade('preact').version(pkg.version);

const createCommand = prog
    .command('create [template] [dest]', '', { default: true })
    .describe('Create a new application');
commands.createOptions.forEach(option => {
    createCommand.option(option.name, option.description, option.default);
});
createCommand.action(commands.create);

prog.command('list').describe('List official templates').action(commands.list);

prog.parse(process.argv);