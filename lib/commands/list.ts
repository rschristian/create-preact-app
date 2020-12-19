import { bold, magenta } from 'kleur/colors';
import { error, info, templateInfo } from '../util';

export async function command(): Promise<void> {
    try {
        const repos = await templateInfo();

        info('\nAvailable official templates: \n');

        repos.map((repo) => {
            const description = repo.description ? ` - ${repo.description}` : '';
            process.stdout.write(`  ⭐️  ${bold(magenta(repo.name))}${description} \n`);
        });

        process.stdout.write('\n');
    } catch (err) {
        error((err && err.stack) || err.message || err, 1);
    }
}
