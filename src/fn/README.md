# Actions

Actions are defined as usable if they exist in this directory.

The API is that they should export something like this:

```js
module.exports = {
    requiresInstance: true,
    execute: async (projectDir, couchUrl, extraArgs) => {
        ...
    }
}
```

**OR** just:

```js
module.exports = async (projectDir, couchUrl, extraArgs) => {
    ...
}
```

In which case defaults will be used.
 - `requiresInstance` means that this action requires that the user provides a configured instance. Optional, defaults to true.
 - `execute` is the function that is run when the action is executed, and is passed the paremeters noted above. Required, obviously.
