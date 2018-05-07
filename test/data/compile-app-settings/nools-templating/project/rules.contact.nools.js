// ==============================
// GENERATE TARGETS
// ==============================
if (c.contact != null && c.contact.type === 'person') {
  emitTarget(c);
}

// ==============================
// GENERATES TASKS
// ==============================
if (c.contact && c.contact.type === 'person') {
  emitTask(c);
}

emit('_complete', { _id: true });
