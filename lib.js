////////////////////////////////
// Insert debug window in DOM //
////////////////////////////////

var debugTpl = {};
Meteor.startup(function() {
  var view = Blaze.render(Template.templateInspector, document.body);
  debugTpl = view.templateInstance();
});

/////////////////////////////////////////////
// Attach attr and events to all templates //
/////////////////////////////////////////////

var getTplName = function(tpl) {
  var name = Meteor._get(tpl, "view", "name") || "";
  return name.slice(9); // Removes "Template."
}

Template.onRendered(function() {
  var tplName = getTplName(this);
  if (!this.firstNode || _.contains(["", "body", "TI", "TI_active", "TI_history"], tplName)) return;
  $(this.firstNode).attr("data-template", tplName);
});

var handle = null;
Template.body.events({
  "mouseenter [data-template]": function(e, data, tpl) {
    if (handle) Meteor.clearTimeout(handle);
    handle = Meteor.setTimeout(function() {
      debugTpl.state("activeTpl", tpl);
      $("[data-template]").removeClass("ti-active");
      $(e.target).addClass("ti-active");
    }, 500);
  }
});

/////////////////////
// Track templates //
/////////////////////

TplHistory = new Mongo.Collection(null);

var tplOmit = ["templateInspector", "TI_active", "TI_history", "__dynamic", "__dynamicWithDataContext"];
var saveTplHistory = function(ev, tpl) {
  try {
    var tplName = getTplName(tpl);
    if (!tplName || _.contains(tplOmit, tplName)) return;
    TplHistory.insert({ ev: ev, name: tplName, el: tpl.firstNode, doneAt: Date.now() });
  } catch(err) {}
}

Template.onCreated(function() {
  saveTplHistory("created", this);
});

Template.onRendered(function() {
  saveTplHistory("rendered", this);
});

Template.onDestroyed(function() {
  saveTplHistory("destroyed", this);
});

////////////////////////////////
// Debug window data & events //
////////////////////////////////

Template.templateInspector.hooks({
  created: function() {
    var tpl = this;
    tpl.state("activeTpl", {});
    tpl.state("section", "TI_active");
    tpl.state("reduced", (localStorage.getItem("TIreduced") == "true") || false);
  },
  rendered: function() {
    var el = this.$(".template-inspector");
    el.resizable();
    el.draggable({
      handle: ".ti-header"
    });
  }
});

Template.templateInspector.events({
  "click [data-section]": function(e, tpl) {
    tpl.state("section", $(e.currentTarget).data("section"));
  },
  "click [data-toggle-visibility]": function(e, tpl) {
    tpl.state("reduced", !tpl.state("reduced"));
    localStorage.setItem("TIreduced", tpl.state("reduced"));
  },
  "click [data-log-instance]": function(e, tpl) {
    var tpl = tpl.state("activeTpl");
    console.log("Tpl instance for '" + tpl.view.name + "':", tpl);
  }
});

Template.TI_active.rendered = function() {
  var content = $(".template-inspector .ti-content");
  content.scrollTop(0);
};

Template.TI_active.helpers({
  name: function() {
    var tpl = Template.instance().parent(3).state("activeTpl") || {};
    return getTplName(tpl);
  },
  events: function() {
    var tpl = Template.instance().parent(3).state("activeTpl");
    var eventMaps = Meteor._get(tpl, "view", "template", "__eventMaps") || [];
    var events = [];
    _.each(eventMaps, function(map) {
      events = events.concat(_.keys(map));
    });
    return events;
  },
  helprs: function() {
    var tpl = Template.instance().parent(3).state("activeTpl");
    var helpers = Meteor._get(tpl, "view", "template", "__helpers") || {};
    return _.map(_.keys(helpers), function(helper) {
      return helper.trim();
    });
  },
  data: function() {
    var tpl = Template.instance().parent(3).state("activeTpl");
    var data = Meteor._get(tpl, "data") || {};
    var result = [];
    _.each(data, function(value, key) {
      result.push({
        key: key,
        value: value
      })
    });
    return result;
  },
  instanceVars: function() {
    var tpl = Template.instance().parent(3).state("activeTpl");
    var keys = _.difference(_.keys(tpl), ["data", "firstNode", "lastNode", "view"]);
    var vars = _.map(keys, function(key) {
      return {
        key: key,
        value: tpl[key]
      };
    });
    return vars;
  }
});

Template.TI_history.rendered = function() {
  var content = $(".template-inspector .ti-content");
  content.scrollTop(content.get(0).scrollHeight);
}

Template.TI_history.helpers({
  events: function() {
    return TplHistory.find();
  }
});

//////////
// MISC //
//////////

UI.registerHelper("equals", function(v1, v2) {
  return (v1 === v2);
});
