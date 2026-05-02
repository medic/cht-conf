module.exports = {
  AGENTS_MD: `# CHT Project AI Agent Guide

This project is a CHT (Community Health Toolkit) configuration project.

## Project Structure
Refer to the bundled documentation in your \`cht-conf\` installation for details on the project structure.
- Forms: \`forms/app/\`, \`forms/contact/\`, \`forms/training/\`
- Tasks: \`tasks.js\`
- Targets: \`targets.js\`
- Contact Summary: \`contact-summary.templated.js\`

## Commands
Use the \`cht\` command for all operations.
- \`cht --local\`: Run all default actions against a local instance.
- \`cht --local upload-app-forms\`: Upload forms.
- \`cht --local compile-app-settings\`: Compile settings.
- \`cht --local watch-project\`: Watch for changes and auto-deploy.

## Documentation
Documentation for \`cht-conf\` and CHT configuration can be found locally in the \`cht-conf\` package directory.
`,
  CLAUDE_MD: `# Claude Instructions for CHT Project

You are an AI agent helping with a CHT configuration project.

## Guidelines
- Always follow the directory structure: put forms in the correct \`forms/\` sub-directory.
- When creating a new form, check if it needs a \`.properties.json\` companion file.
- Use \`cht\` commands to verify your changes.
- Refer to local documentation in \`cht-conf/src/docs/\` for CHT-specific conventions.

## Common Tasks
- Adding a form: Put the \`.xlsx\` in \`forms/app/\` (or \`contact/\` or \`training/\`).
- Updating tasks: Modify \`tasks.js\`.
- Updating targets: Modify \`targets.js\`.
`
};
