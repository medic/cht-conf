/* global c, emit, Task, Target */

var tasks = require('tasks.js');
var targets = require('targets.js');
var tasksExtensions = require('cht-tasks-extensions-shim.js');
var targetsExtensions = require('cht-targets-extensions-shim.js');

var taskEmitter = require('./task-emitter');
var targetEmitter = require('./target-emitter');

// Merge base tasks/targets with auto-included extensions
var allTasks = (Array.isArray(tasks) ? tasks : []).concat(tasksExtensions);
var allTargets = (Array.isArray(targets) ? targets : []).concat(targetsExtensions);

targetEmitter(allTargets, c, Utils, Target, emit);
taskEmitter(allTasks, c, Utils, Task, emit);

emit('_complete', { _id: true });
