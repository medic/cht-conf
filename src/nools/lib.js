/* global c, emit, Task, Target */

const tasks = require('tasks.js');
const targets = require('targets.js');
const tasksExtensions = require('cht-tasks-extensions-shim.js');
const targetsExtensions = require('cht-targets-extensions-shim.js');

const taskEmitter = require('./task-emitter');
const targetEmitter = require('./target-emitter');

// Merge base tasks/targets with auto-included extensions
const allTasks = (Array.isArray(tasks) ? tasks : []).concat(tasksExtensions);
const allTargets = (Array.isArray(targets) ? targets : []).concat(targetsExtensions);

targetEmitter(allTargets, c, Utils, Target, emit);
taskEmitter(allTasks, c, Utils, Task, emit);

emit('_complete', { _id: true });
