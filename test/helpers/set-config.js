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

function setProjectConfigForErrorsAndWarning(project) {
  project.setConfig({
    rules: {
      'no-bare-strings': true,
      'no-html-comments': true,
    },
    pending: [
      {
        moduleId: 'app/templates/application',
        only: ['no-html-comments'],
      },
    ],
  });
  project.write({
    app: {
      templates: {
        'application.hbs':
          '<h2>Here too!!</h2><div>Bare strings are bad...</div><!-- bad html comment! -->',
      },
    },
  });
}

function setProjectConfigWithoutErrors(project) {
  project.setConfig({
    rules: {
      'no-bare-strings': false,
    },
  });

  project.write({
    app: {
      templates: {
        'application.hbs': '<h2>Love for bare strings!!!</h2> <div>Bare strings are great!</div>',
      },
    },
  });
}

module.exports = {
  setProjectConfigForErrors,
  setProjectConfigForErrorsAndWarning,
  setProjectConfigWithoutErrors,
};
