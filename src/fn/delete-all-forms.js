
module.exports = (projectDir, repository) => {
  return repository.formsList({ include_docs: true })
    .then(res => res.rows)
    .then(forms => Promise.all(forms.map(f => repository.remove(f.doc))));
};
