# Create-Preact-App

This tool is the result of extracting the "create" functionality out of the Preact-CLI. 

How is this useful? `npm init` and `yarn create` both need to resolve all dependencies of the initializer (the library) before they can actually run it. This means that in order to use Preact-CLI's "create" functionality, totally irrelevant dependencies like Webpack and Babel need to be installed too. Remember, this isn't setting up your app, just starting the tool that will clone a template. This is quite the slow and wasteful process as a great deal of time is spent resolving unneeded dependencies.

This tool pushes that time down drastically to ~3-4 seconds. Now most of your time will be spent actually installing your template, not starting the CLI. 

That being said, this is mostly for personal used to solve my frustration with the current tool. It's mostly compatible with Preact-CLI, but I have clipped out some functionality that I see no use for. I've also raised the minimum Node version significantly; benefits of not needing backwards compatibility. If you're allergic to globally installed tools as I am, maybe this could be of some use. I'll likely change the API a bit as I see fit, perhaps won't support the same behavior that Preact-CLI does. No real plans at the moment. 

## Usage

```bash
npm init @rschristian/preact-app <template> <application-name>
```

or

```bash
yarn create @rschristian/preact-app <template> <application-name>
```


## License

MIT © Ryan Christian