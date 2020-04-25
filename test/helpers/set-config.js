function setProjectConfigForErrors(project) {
  project.setConfig({
    rules: {
      'no-bare-strings': true,
    },
  });

  project.write({
    app: {
      templates: {
        'application.hbs': '<h2>Here too!!</h2> <div>Bare strings are bad...</div>',
        components: {
          'foo.hbs': '{{fooData}}',
        },
      },
    },
  });
}

module.exports = {
  setProjectConfigForErrors,
};
