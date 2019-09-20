let state = {
  pathToProject: '.',
  isArchiveMode: false,
};

const initialize = (pathToProject, isArchiveMode, extraArgs, apiUrl) => {
  if (state.initialized) {
    throw Error('environment is already initialized');
  }

  state = {
    pathToProject,
    isArchiveMode,
    extraArgs,
    apiUrl,
    initialized: true,
  };
};

module.exports = {
  initialize,

  get pathToProject() { return state.pathToProject; },
  get isArchiveMode() { return state.isArchiveMode; },
  get extraArgs() { return state.extraArgs; },
  get apiUrl() { return state.apiUrl; },
};
