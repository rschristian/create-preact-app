import fetch from 'isomorphic-unfetch';
import { bold, magenta } from 'kleur/colors';
import { error, info } from '../util';

type UnprocessedRepo = {
    name: string;
    full_name: string;
    description: string;
    archived: boolean;
};

export async function command(): Promise<void> {
    try {
        const repos: UnprocessedRepo[] = await fetch('https://api.github.com/users/preactjs-templates/repos').then((r) => r.json());

        info('\nAvailable official templates: \n');

        repos
			.filter(repo => !repo.archived)
			.forEach(repo => {
				const description = repo.description ? ` - ${repo.description}` : '';
				process.stdout.write(
					`  ⭐️  ${bold(magenta(repo.name))}${description} \n`
				);
			});

        process.stdout.write('\n');
    } catch (err) {
        error((err && err.stack) || err.message || err, 1);
    }
}
