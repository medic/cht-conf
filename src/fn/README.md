# Actions

Actions are defined as usable if they exist in this directory.

Their module should look something like this:

```js
module.exports = {
  requiresInstance: true,
  validate: async () => {
    ...
  },
  execute: async () => {
    ...
  }
};
```

## Module Exports

|Field|Required|Notes|
|---|---|---|
|`requiresInstance`|Optional, defaults to `true`|The action needs the user to have provided a instance location, e.g. via `--local` or `--instance`|
|`execute`|Required|The function that is run when the action is executed.|
|`validate`|Optional|The function that is run before the `execute` method to perform validations. All the actions validations are executed first, and if one fails, the execution of all the actions is aborted.|

While an exception thrown by `execute` will not just stop the execution of the action but also the abortion of the whole process, `validate` won't prevent the app to run all the validations of the remaining actions, but after `medic-conf` execute all the actions validations, if one or more of them failed, will abort the process, preventing the execution of any action (`execute` method), not just the ones with failed validations.