# AGENTS.md

## Setup

### Requirements

- Node.js >=20.0.0
- Python 3
- Git (for development)

### Environment

- Docker (required for E2E tests via CHT Docker Helper)
- Internet connection (for downloading dependencies and connecting to CHT instances)

### Installation

```bash
# Install cht-conf globally
npm install -g cht-conf

# Install required Python dependency
pip install git+https://github.com/medic/pyxform.git@medic-conf-1.17#egg=pyxform-medic

# For local development
git clone https://github.com/medic/cht-conf.git
cd cht-conf
npm install
```

### Docker Alternative

```bash
# Run using Docker (example: run tests)
docker run -it --rm -v "$PWD":/workdir medicmobile/cht-app-ide npm test
# Or run end-to-end tests
docker run -it --rm -v "$PWD":/workdir medicmobile/cht-app-ide npm run test-e2e
# For more available commands, see the documentation at https://github.com/medic/cht-conf#usage or run:
docker run -it --rm -v "$PWD":/workdir medicmobile/cht-app-ide --help
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
npm run semantic-release      # Release new version (for maintainers)

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
- Tests across multiple Node.js versions (20.x, 22.x, 24.x)

### Semantic Versioning

The project uses semantic-release for automated versioning based on commit messages.

## Notes for AI Agents

- Use `npm test` for unit tests and `npm run test-e2e` for integration tests.
- All new code should include corresponding tests in the mirrored `test/` directory.
- Follow the Action Module Pattern for new functionality in `src/fn/`.
- Form validation modules should follow the Form Validation Pattern in `src/lib/validation/form/`.
- PRs must pass CI (lint + tests) before merging.
- All commits should follow the Conventional Commits format.

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
