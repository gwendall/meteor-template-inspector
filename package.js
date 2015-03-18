Package.describe({
  name: "gwendall:template-inspector",
  summary: "Inspector for Blaze templates",
  git: "https://github.com/gwendall/meteor-template-inspector.git",
  version: "0.1.6"
});

Package.onUse(function (api, where) {

  api.use([
    "mizzao:jquery-ui@1.11.2",
    "mongo@1.0.11",
    "templating@1.0.11",
    "underscore@1.0.2",
    "momentjs:moment@2.9.0",
    "aldeed:template-extension@3.4.3",
    "gwendall:body-events@0.1.6",
    "gwendall:template-states@0.1.0"
  ], "client");

  api.addFiles([
    "lib.html",
    "lib.css",
    "lib.js",
  ], "client");

});
