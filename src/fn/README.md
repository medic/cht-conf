# Actions

Actions are defined as usable if they exist in this directory.

Their module should look something like this:

```js
module.exports = {
    requiresInstance: true,
    execute: async () => {
        ...
    }
}
```

We still support the legacy version, which will use the defaults noted below:

```js
module.exports = async () => {
    ...
}
```

## Module Exports

|Field|Required|Notes|
|---|---|---|
|`requiresInstance`|Optional, defaults to `true`|The action needs the user to have provided a instance location, e.g. via `--local` or `--instance`|
|`execute`|Required|the function that is run when the action is executed.|
