module.exports = {
  fields: [
    {
      appliesToType: 'person',
      label: 'testing',
      value: 5,
    },
    {
      appliesToType: 'person',
      label: 'contact.age',
      value: contact.date_of_birth,
      filter: 'age',
      width: 3,
    },
  ],

  cards: [],

  context: {
    foo: 'bar',
    muted: contact.type === 'clinic' && lineage[0] && !!lineage[0].muted,
  },
};
