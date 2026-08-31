# CHT Conf

![GitHub license](https://img.shields.io/github/license/medic/cht-conf)
![GitHub release](https://img.shields.io/github/v/release/medic/cht-conf)
[![Discourse](https://img.shields.io/badge/discourse-join-blue)](https://forum.communityhealthtoolkit.org/)

CHT Conf is a command-line interface tool to manage and configure apps built using the [CHT Core Framework](https://github.com/medic/cht-core).

Instructions on how to use this tool can be found on [the CHT documentation site](https://docs.communityhealthtoolkit.org/community/contributing/code/cht-conf/).

## Copyright

Copyright 2013-2026 Medic Mobile, Inc. <hello@medic.org>

## License

The software is provided under AGPL-3.0. Contributions to this project are accepted under the same license.

## AI Agent Support

\`cht-conf\` includes features to make it easier for AI coding agents (like Claude, GitHub Copilot, or specialized CHT agents) to work on your project.

### Initializing Agent Support
For existing projects, run:
\`\`\`bash
cht agents-md
\`\`\`
This generates \`AGENTS.md\` and \`CLAUDE.md\` files in your project root, which provide instructions and context for AI tools.

### Local Documentation
\`cht-conf\` bundles key documentation locally so agents have access to version-matched guides without needing internet access. You can also manually refresh this documentation:
\`\`\`bash
cht update-docs
\`\`\`

### Inspection Commands
Agents can use \`inspect\` commands to verify the state of a deployed CHT instance:
- \`cht inspect-forms\`: List all forms on the instance.
- \`cht inspect-form <id>\`: Show details of a specific form.
- \`cht inspect-settings-diff\`: Compare local settings with the instance.
- \`cht inspect-tasks\`: List all deployed task definitions.
- \`cht inspect-targets\`: List all deployed target definitions.
- \`cht inspect-hierarchy\`: View the contact hierarchy tree.
- \`cht inspect-transitions\`: List transitions and deprecation warnings.

All \`inspect\` commands support a \`--json\` flag for machine-parseable output.
