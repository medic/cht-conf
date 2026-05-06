# AGENTS.md

## Setup

### Requirements

- Node.js >=20.0.0
- Python 3
- Git (for development)

### Environment

- Docker (required for E2E tests via CHT Docker Helper)
- Internet connection (for downloading dependencies)

### Installation

```bash
# Install cht-conf globally
npm install -g cht-conf

# Install required Python dependency
pip install git+https://github.com/medic/pyxform.git@medic-conf-1.17#egg=pyxform-medic

# For local development
git clone https://github.com/medic/cht-conf.git
cd cht-conf
npm ci
```


## Build & Test

```bash
# Code Quality
npm run eslint                # Run linting checks

# Testing
npm test                      # Run unit tests with Mocha and NYC coverage
npm run test-e2e              # Run end-to-end tests (requires Docker)

# Build and Maintenance
npm run clean                 # Clean build directory

# Development
node src/bin/index.js <actions>  # Run locally for development
```

## Project Structure

```
cht-conf/
├── bin/                  # Binary executables used by the application
├── src/                  # Source code
│   ├── bin/              # Entry point scripts and shell integrations
│   ├── cli/              # Command-line interface code
│   ├── contact-summary/  # Contact summary utilities
│   ├── fn/               # Core functionality implementations (actions)
│   ├── lib/              # Shared libraries and utilities
│   │   └── validation/   # Form validation modules
│   └── nools/            # Rule engine related code
└── test/                 # Test code
    ├── contact-summary/  # Tests for contact summary features
    ├── e2e/              # End-to-end tests
    ├── fn/               # Tests for core functionality
    ├── lib/              # Tests for shared libraries
    └── nools/            # Tests for nools rules
```

## Code Conventions

### Action Module Pattern

Files in `src/fn/` use this pattern:

```javascript
module.exports = {
  requiresInstance: true, // Whether connection to CHT is needed
  execute: async () => {
    // Implementation
  },
};
```

### Form Validation Pattern

Files in `src/lib/validation/form/` use this pattern:

```javascript
module.exports = {
  requiresInstance: false,
  skipFurtherValidation: true,
  execute: async ({ xformPath, xmlStr, xmlDoc, apiVersion }) => {
    // Implementation
  },
};
```

### Code Style

- ESLint enforces:
  - ES2022 syntax
  - Single quotes (template literals allowed)
  - Semicolons required
  - No console logging
  - Strict equality (===)
  - Extends @medic ESLint config
- EditorConfig settings:
  - 2-space indentation
  - LF line endings
  - UTF-8 encoding
  - Final newline in files

### Testing Framework

- Mocha for test runner
- Chai for assertions (with chai-as-promised and other plugins)
- NYC for code coverage
- Sinon for mocks and stubs
- Tests mirror the src directory structure
- E2E tests use CHT Docker Helper

## PR & CI Guidelines

### Commit Format

The project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint:

```
feat(scope): add new feature
fix(scope): fix bug
docs(scope): update documentation
chore(scope): update tooling
```

### Branches

- Main branch: `main`
- PRs should be created against the `main` branch

### CI Process

GitHub Actions workflow runs:

- Lint checks (`npm run eslint`)
- Unit tests (`npm test`)
- E2E tests (`npm run test-e2e`)
- Tests across multiple Node.js versions (20.x, 22.x, 24.x)

### Semantic Versioning

The project uses semantic-release for automated versioning based on commit messages.

## Non-obvious gotchas when contributing to cht-conf

### `getFormDir` returns `null` silently — not an error
`src/lib/forms-utils.js` `getFormDir()` returns `null` when the directory is absent.
Callers that don't check the return value will silently do nothing. This is intentional:
a missing `forms/app/` in the user's project is not an error in cht-conf itself.
When writing new actions that iterate over forms, always guard against a `null` result.

### Declarative schema validation uses conditional Joi rules — test every branch
`src/lib/compilation/validate-declarative-schema.js` uses Joi conditionals that look
like the field is always optional but are actually required or forbidden depending on
sibling field values. Key pairs:
- `event.days` vs `event.dueDate` — mutually exclusive; neither both nor neither is valid.
- `resolvedIf` — required only when every action has `type: 'contact'`, optional otherwise.
- `passesIf` — required for `type: 'percent'` targets without `groupBy`; forbidden if `groupBy` is set.
- multi-event tasks — `event.id` optional for single-event tasks, required + unique for 2+.

When extending the schema, always add a test that confirms both the "forbidden" and
"required" branches, not just the happy path.

### `rules.nools.js` and `tasks.js`/`targets.js` are mutually exclusive
`src/lib/compilation/compile-tasks-and-targets.js` fails at compile time if both
the legacy (`rules.nools.js`) and declarative (`tasks.js` + `targets.js`) files exist.
Both declarative files must be present together; either alone is also an error.
Test fixtures that mix styles will break this validation by design.

### `appliesToType` semantics differ by `appliesTo` value — no compile check
In `src/nools/task-emitter.js`, `appliesToType` is matched against `report.form`
when `appliesTo: 'reports'` or `'scheduled_tasks'`, but against the resolved contact type
when `appliesTo: 'contacts'`. Contact type itself is resolved as `contact.contact_type`
when `contact.type === 'contact'`, otherwise `contact.type`. There is no schema validation
for this; wrong `appliesToType` values produce silent task non-emission in tests and prod.

### `appliesIf` arity changes with `appliesTo: 'scheduled_tasks'`
`src/nools/task-emitter.js` passes a third `scheduledTaskIndex` argument to `appliesIf`
only when `appliesTo: 'scheduled_tasks'`. Copying task fixtures between `appliesTo` types
without adjusting the function signature will silently break the condition logic.

### `.properties.json` unknown fields are warned, not errored
`src/lib/upload-forms.js` accepts only a fixed set of properties. Unknown fields log a
warning and are discarded — they never surface as failures. If a test asserts that a
certain property was applied, verify it is in the allowed set before trusting the test
was actually exercising the right code path.

### `internalId` in `.properties.json` is deprecated and errors on mismatch
If a `.properties.json` contains `internalId`, it must exactly match the filename-derived
ID or upload throws. New code and fixtures should never write `internalId`; existing
fixtures that carry it are testing the deprecation warning path, not a live feature.

## Security Considerations

- Do not commit secrets or environment variables.
- Use the provided API abstractions in `src/lib/` rather than direct connections.
- Follow project ESLint rules to avoid unsafe code patterns.
- Authentication credentials should be handled securely through the CLI parameters.

## CLI Usage

```bash
# Default workflow with local CHT instance
cht --local

# Specific action
cht --local upload-app-forms

# Filter forms
cht --local upload-app-forms -- form1 form2

# Archive mode
cht --archive --destination=<path>

# Run locally for development
node src/bin/index.js <action>
```
