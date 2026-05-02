const path = require('node:path');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const { info, warn } = require('../lib/log');
const { AGENTS_MD, CLAUDE_MD } = require('../lib/agent-templates');

const execute = async () => {
  const projectDir = environment.pathToProject;
  
  const files = [
    { name: 'AGENTS.md', content: AGENTS_MD },
    { name: 'CLAUDE.md', content: CLAUDE_MD }
  ];

  for (const file of files) {
    const filePath = path.join(projectDir, file.name);
    if (fs.exists(filePath)) {
      warn(`${file.name} already exists at ${filePath}. Skipping.`);
    } else {
      info(`Creating ${file.name} at ${filePath}`);
      fs.write(filePath, file.content);
    }
  }
};

module.exports = {
  requiresInstance: false,
  execute
};
