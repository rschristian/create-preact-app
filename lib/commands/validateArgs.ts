import { error } from '../util';

export interface ArgvOption {
    name: string;
    description: string;
    default?: string | boolean;
}

export function validateArgs(argv: Record<string, unknown>, options: ArgvOption[], command: 'create' | 'list'): void {
    const normalizedOptions: string[] = options
        .map((option) => option.name.split(','))
        .flat(1)
        .map((option) => {
            option = option.trim();
            if (option.startsWith('--')) {
                return option.substr(2);
            } else if (option.startsWith('-')) {
                return option.substr(1);
            }
        })
        .filter(String) as string[];
    for (const arg in argv) {
        if (arg === '_') {
            // ignore this arg
            continue;
        }
        if (!normalizedOptions.includes(arg)) {
            error(
                `Invalid argument ${arg} passed to ${command}. Please refer to 'preact ${command} --help' for full list of options.\n\n`,
            );
        }
    }
}
