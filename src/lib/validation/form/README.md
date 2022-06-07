# Form validations

Form validations should be added to this directory.

Their module should look something like this:

```js
module.exports = {
  requiresInstance: true,
  execute: async ({ xformPath, xmlStr, xmlDoc }) => {
    ...
  }
};
```

## Module Exports

| Field              | Required                     | Notes                                                                                                                                                 |
|--------------------|------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| `requiresInstance` | Optional, defaults to `true` | The validation needs the user to have provided a instance location, e.g. via `--local` or `--instance`                                                |
| `execute`          | Required                     | The function that is run when the validation is executed. The provided input argument contains the form XML data as both a string and a XML Document. |

## Result

The result has the following format:

| Field    | Notes                                                                                              |
|----------|----------------------------------------------------------------------------------------------------|
| warnings | Array containing the descriptions of any warnings.                                                 |
| errors   | Array containing the descriptions of any errors. If this is empty, the form has passed validation. |
