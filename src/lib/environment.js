const state = {};

const initialize = (pathToProject, isArchiveMode, archiveDestination, extraArgs, apiUrl, force) => {
  if (state.initialized) {
    throw Error('environment is already initialized');
  }

  Object.assign(state, {
    apiUrl,
    archiveDestination,
    extraArgs,
    initialized: true,
    isArchiveMode,
    pathToProject,
    force
  });
};

module.exports = {
  initialize,

  get pathToProject() { return state.pathToProject || '.'; },
  get isArchiveMode() { return !!state.isArchiveMode; },
  get archiveDestination() { return state.archiveDestination; },
  get instanceUrl() { return this.apiUrl && this.apiUrl.replace(/\/medic$/, ''); },
  get extraArgs() { return state.extraArgs; },
  get apiUrl() { return state.apiUrl; },
  get force() { return state.force; }
};
