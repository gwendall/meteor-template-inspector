////////////////////////////////
// Insert debug window in DOM //
////////////////////////////////

Meteor.startup(function() {
  Session.set("activeTpl", null);
  Blaze.render(Template.templateInspector, document.body);
});

//////////////////////////
// Functions and params //
//////////////////////////

var getTplName = function(tpl) {
  var name = (tpl && Meteor._get(tpl, "view", "name")) || "";
  return name.slice(9); // Removes "Template."
}

var setTplActive = function(tplId) {
  Session.set("activeTpl", tplId);
  $("[data-template]").removeClass("ti-active");
  $("[data-template='" + tplId + "']").addClass("ti-active");
}

var getTplInstance = function(tplId) {
  var view = Blaze.getView($("[data-template='" + tplId + "']").get(0));
  var tpl = view && view.templateInstance && view.templateInstance();
  return tpl || {};
}

var getTplActive = function() {
  var tplId = Session.get("activeTpl");
  return getTplInstance(tplId);
}

var tplOmit = ["", "body", "__dynamic", "__dynamicWithDataContext", "__IronDefaultLayout__", "templateInspector", "TI_active", "TI_history", "TI_list", "TI_listItem",  "TI_listItemChildren"];

/////////////////////////////////////////////
// Attach attr and events to all templates //
/////////////////////////////////////////////

Template.onRendered(function() {

  var tpl = this;
  var tplName = getTplName(tpl);
  if (!this.firstNode || _.contains(tplOmit, tplName)) return;

  // Add a random ID to each rendered template
  var el = $(tpl.firstNode);
  var tplId = Random.id();
  el.attr("data-template", tplId);
  tpl.state("tplId", tplId);

  // Store the template ref w its parent in local DB for filetree
  /*
  var parentId = null;
  for (var i = 0; i < 10; i++) {
    var parent = tpl.parent(i);
    parentId = parent && parent.state && parent.state("tplId");
    if (parentId && (parentId != tplId)) break;
  }
  */
  var parentId = el.parents("[data-template]").first().attr("data-template");
  TplList.insert({
    tplId: tplId,
    tplName: tplName,
    parentId: parentId,
    renderedAt: Date.now()
  });

  // Handle cases when the child gets rendered before its parent
  var children = el.find("[data-template]");
  children.each(function() {
    var childrenId = $(this).attr("data-template");
    var selector = { tplId: childrenId };
    var modifier = { $set: { parentId: tplId }};
    TplList.update(selector, modifier);
  });

});

// Remove destroyed templates from DB
Template.onDestroyed(function() {
  var tpl = this;
  var tplName = getTplName(tpl);
  if (_.contains(tplOmit, tplName)) return;
  var tplId = tpl.state("tplId"); // Take state instead of DOM attr because sometime the tpl.firstNode is not avail in destroyed tpls
  TplList.remove({
    tplId: tplId
  });
});

TplList = new Mongo.Collection(null);
TplList.helpers({
  tplChildren: function() {
    var selector = { parentId: this.tplId };
    var options = {};
    return TplList.find(selector, options);
  },
  tplParentName: function() {
    var tpl = getTplInstance(this.parentId);
    return getTplName(tpl);
  }
});

var handle = null;
Template.body.events({
  "mouseenter [data-template]": function(e, data, tpl) {
    if (handle) Meteor.clearTimeout(handle);
    handle = Meteor.setTimeout(function() {
      var tplId = tpl.state("tplId");
      setTplActive(tplId);
    }, 500);
  },
  "mouseleave [data-template]": function() {
    if (handle) Meteor.clearTimeout(handle);
  }
});

//////////////////////
// Template history //
//////////////////////

/*
TplHistory = new Mongo.Collection(null);

var saveTplHistory = function(ev, tpl) {
  Meteor.setTimeout(function() {
    try {
      var tplName = getTplName(tpl);
      if (_.contains(tplOmit, tplName)) return;
      TplHistory.insert({ ev: ev, name: tplName, doneAt: Date.now() });
    } catch(err) {}
  }, 0);
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

Template.TI_history.rendered = function() {
  var content = $(".template-inspector .ti-content");
  content.scrollTop(content.get(0).scrollHeight);
}

Template.TI_history.helpers({
  items: function() {
    var selector = {};
    var options = { limit: 10 };
    var options = {};
    return TplHistory.find(selector, options);
  }
});
*/

////////////////////////////////
// Debug window data & events //
////////////////////////////////

Template.templateInspector.hooks({
  created: function() {
    var tpl = this;
    tpl.state("section", "TI_active");
    tpl.state("reduced", (localStorage.getItem("TIreduced") == "true") || false);
    tpl.autorun(function() {
      var reduced = tpl.state("reduced");
      if (reduced) return $("body").removeClass("template-inspector-on");
      return $("body").addClass("template-inspector-on");
    });

    tpl.state("activeTpl", {});
    tpl.state("activeTplName", "Active");
    tpl.autorun(function() {
      var tt = Session.get("activeTpl");
      var activeTpl = getTplActive();
      tpl.state("activeTpl", activeTpl);
      tpl.state("activeTplName", getTplName(activeTpl) || "Active");
    });
  },
  rendered: function() {
    var el = this.$(".template-inspector");
    el.resizable({
      stop: function(ev, ui) {
        localStorage.setItem("TIwidth", el.outerWidth());
        localStorage.setItem("TIheight", el.outerHeight());
      }
    });
    el.draggable({
      handle: ".ti-header",
      stop: function(ev, ui) {
        localStorage.setItem("TItop", el.position().top);
        localStorage.setItem("TIleft", el.position().left);
      }
    });
    var css = { opacity: 1 };
    if (localStorage.getItem("TIwidth")) css.width = localStorage.getItem("TIwidth") + "px";
    if (localStorage.getItem("TIheight")) css.height = localStorage.getItem("TIheight") + "px";
    if (localStorage.getItem("TItop")) css.top = localStorage.getItem("TItop") + "px";
    css.left = localStorage.getItem("TIleft") ? localStorage.getItem("TIleft") + "px" : $(window).width() - el.width() + "px";
    el.css(css);
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
    console.log("Tpl instance for '" + getTplName(tpl) + "':", tpl);
  }
});

/////////////////////
// Template active //
/////////////////////

Template.TI_active.rendered = function() {
  var content = $(".template-inspector .ti-content");
  content.scrollTop(0);
};

Template.TI_active.helpers({
  has: function() {
    return !!Session.get("activeTpl");
  },
  name: function() {
    var tpl = getTplActive();
    return getTplName(tpl);
  },
  events: function() {
    var tpl = getTplActive();
    var eventMaps = Meteor._get(tpl, "view", "template", "__eventMaps") || [];
    var events = [];
    _.each(eventMaps, function(map) {
      events = events.concat(_.keys(map));
    });
    return events;
  },
  helprs: function() {
    // return [];
    var tpl = getTplActive();
    var helpers = Meteor._get(tpl, "view", "template", "__helpers") || {};
    var result = [];
    _.each(helpers, function(value, key) {
      result.push({
        key: key.trim(),
        value: ""
        // value: value
      });
    });
    return result;
  },
  data: function() {
    var tpl = getTplActive();
    var data = Meteor._get(tpl, "data") || {};
    var result = [];
    _.each(data, function(value, key) {
      result.push({
        key: key,
        value: value
      });
    });
    return result;
  },
  instanceVars: function() {
    var tpl = getTplActive();
    var keys = _.difference(_.keys(tpl), ["data", "firstNode", "lastNode", "view", "tplId"]);
    var vars = _.map(keys, function(key) {
      return {
        key: key,
        value: tpl[key]
      };
    });
    return vars;
  }
});

///////////////////
// Template list //
///////////////////

Template.TI_list.helpers({
  items: function() {
    /*
    var selector = { parentId: null };
    var options = { limit: 10 };
    */
    var selector = {};
    var options = { sort: { tplName: -1 }};
    return TplList.find(selector, options);
  }
});

Template.TI_list.events({
  "click [data-template-activate]": function(e, tpl) {
    var tplId = $(e.currentTarget).attr("data-template-activate");
    setTplActive(tplId);
  },
  "mouseenter [data-template-activate]": function(e, tpl) {
    var tplId = $(e.currentTarget).attr("data-template-activate");
    $("[data-template]").removeClass("ti-active");
    $("[data-template='" + tplId + "']").addClass("ti-active");
  },
  "mouseleave [data-template-activate]": function(e, tpl) {
    var tplId = Session.get("activeTpl");
    setTplActive(tplId);
  }
});

/*
Template.TI_listItem.created = function() {
  var tpl = this;
  tpl.state("tplId", this.data.tplId);
}

Template.TI_listItem.helpers({
  active: function() {
    var tpl = Template.instance();
    return (tpl.state("tplId") === Session.get("activeTpl"));
  }
});
*/

Template.TI_listItem.helpers({
  active: function() {
    return (Session.get("activeTpl") === this.tplId);
  }
});

////////////////
// UI helpers //
////////////////

UI.registerHelper("equals", function(v1, v2) {
  return (v1 === v2);
});

UI.registerHelper("moment", function(date, format) {
  var m = moment(date);
  if (_.isString(format)) {
    m = m.format(format);
  } else {
    m = m.fromNow();
  }
  return m;
});
