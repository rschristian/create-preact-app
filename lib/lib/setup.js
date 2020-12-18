const spawn = require('cross-spawn-promise');
const { hasCommand, warn } = require('../util');

const stdio = 'ignore';

exports.install = function (cwd, packageManager) {
    return spawn(packageManager, ['install'], { cwd, stdio: 'inherit' });
};

// Initializes the folder using `git init` and a proper `.gitignore` file
// if `git` is present in the $PATH.
exports.initGit = async function (target) {
    let git = hasCommand('git');

    if (git) {
        const cwd = target;

        await spawn('git', ['init'], { cwd });
        await spawn('git', ['add', '-A'], { cwd });

        let gitUser, gitEmail;
        const defaultGitUser = 'Preact CLI';
        const defaultGitEmail = 'preact-cli@users.noreply.github.com';

        try {
            gitEmail = (await spawn('git', ['config', 'user.email'])).toString();
        } catch (e) {
            gitEmail = defaultGitEmail;
        }

        try {
            gitUser = (await spawn('git', ['config', 'user.name'])).toString();
        } catch (e) {
            gitUser = defaultGitUser;
        }

        await spawn('git', ['commit', '-m', 'initial commit from Preact CLI'], {
            cwd,
            env: {
                GIT_COMMITTER_NAME: gitUser,
                GIT_COMMITTER_EMAIL: gitEmail,
                GIT_AUTHOR_NAME: defaultGitUser,
                GIT_AUTHOR_EMAIL: defaultGitEmail,
            },
        });
    } else {
        warn('Could not locate `git` binary in `$PATH`. Skipping!');
    }
};