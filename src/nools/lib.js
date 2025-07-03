/* eslint-disable n/no-missing-require */
/* global c, emit, Task, Target */

const tasks = require('tasks.js');
const targets = require('targets.js');

const taskEmitter = require('./task-emitter'); 
const targetEmitter = require('./target-emitter');

targetEmitter(targets, c, Utils, Target, emit);
taskEmitter(tasks, c, Utils, Task, emit);

emit('_complete', { _id: true });
