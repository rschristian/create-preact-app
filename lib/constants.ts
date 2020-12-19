export const TEMPLATES_REPO_URL = 'https://api.github.com/users/preactjs-templates/repos';

export const ORG = 'preactjs-templates';

export const CUSTOM_TEMPLATE = {
    value: 'custom',
    title: 'Custom',
    description: 'Use your own template',
};

export const FALLBACK_TEMPLATE_OPTIONS = [
    {
        value: 'preactjs-templates/default',
        title: 'default',
        description: 'The default template for Preact CLI',
    },
    {
        value: 'preactjs-templates/typescript',
        title: 'typescript',
        description: 'The default template for Preact CLI in typescript',
    },
    {
        value: 'preactjs-templates/simple',
        title: 'simple',
        description: 'A simple, minimal "Hello World" template for Preact CLI',
    },
    {
        value: 'preactjs-templates/widget',
        title: 'widget',
        description: 'Template for a widget to be embedded in another website',
    },
    {
        value: 'preactjs-templates/widget-typescript',
        title: 'widget-typescript',
        description: 'Typescript template for a widget to be embedded in another website',
    },
];

export const TEMPLATES_CACHE_FOLDER = '.cache';
export const TEMPLATES_CACHE_FILENAME = 'preact-templates.json';
