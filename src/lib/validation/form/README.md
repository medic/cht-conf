# Form validations

Form validations should be added to this directory.

Their module should look something like this:

```js
module.exports = {
  requiresInstance: false,
  skipFurtherValidation: true,
  execute: async ({ xformPath, xmlStr, xmlDoc, apiVersion }) => {
    ...
  }
};
```

## Module Exports

| Field                   | Required                       | Notes                                                                                                                                                                                                                                                                                                                             |
|-------------------------|--------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `requiresInstance`      | Optional, defaults to `true`   | The validation needs the user to have provided a instance location, e.g. via `--local` or `--instance`                                                                                                                                                                                                                            |
| `skipFurtherValidation` | Optional, defaults to `false`  | When `true`, additional validations will not be performed on a form that fails the current validation. The goal is to avoid unnecessary noise in the validation log for forms that are grossly invalid (e.g. XML files that are not actually xForms at all).                                                                      |
| `execute(opts)`         | Required                       | The function that is run when the validation is executed. The available ops are:<br>* `xformPath` - the file path to the form<br>* `xmlStr` - string value of the form XML<br>* `xmlDoc` - Document value of the form XML<br>* `apiVersion` - the version of the CHT instance (if connection information was provided) or `null`  |

## Result

The result has the following format:

| Field    | Notes                                                                                              |
|----------|----------------------------------------------------------------------------------------------------|
| warnings | Array containing the descriptions of any warnings.                                                 |
| errors   | Array containing the descriptions of any errors. If this is empty, the form has passed validation. |
