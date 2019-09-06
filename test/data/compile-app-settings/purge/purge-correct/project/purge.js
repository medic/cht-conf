module.exports = {
  fn: function(userCtx, contact, reports, messages) {
    return reports.map(r => r.reported_date < 10)
      .concat(messages.map(m => m.reported_date < 100))
      .filter(o => o._id);
  },
  run_every_days: 7,
  cron: '0 0 * * SUN'
};
