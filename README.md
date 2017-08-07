```diff
- NOTE: This package is not maintained anymore.
- If you want to help, please reach out to gwendall.esnault@gmail.com
```

Meteor Template Inspector
=======================

Inspector for Blaze templates. See in a snap data, instance variables, helpers and events for your templates.  
[Demo](https://template-inspector.meteor.com)  

Installation
------------

``` sh
meteor add gwendall:template-inspector
```

To do
------------  
- Show proper file-tree for templates (showing nested tpls on click)  
- Show helpers values (right now, not possible since helpers relying on Template.instance() can't get called from outside the template itself)
