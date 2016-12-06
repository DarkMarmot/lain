# Lain.js

An in-memory data store that supports unidirectional data-flow with a tree hierarchy of dynamic, observable scopes. Subscriptions are mediated through 'inversion of access' (where encapsulation is defined from above).
Designed for client or server usage.

## Usage
Install the module with: `npm install lain-js` or place into your `package.json`
and run `npm install`.

```javascript

var Lain = require('../src/lain.js'); // Lain is an instance of Scope

// create a scope hierarchy as in a user-interface

var appScope = Lain.createChild();
var pageScope = appScope.createChild();
var widgetScope = pageScope.createChild();

appScope.data('user').write('Knights of the Eastern Calculus');
appScope.state('url').write('main');

appScope.action('navigate').follow(function(msg){
    appScope.state('url').write(msg);
});

widgetScope.find('navigate').write('Cyberia');

pageScope.find('url').follow(function(msg){
    console.log('Paging to: ' + msg);
});

var flatScope = widgetScope.flatten();
console.log(Object.keys(flatScope));

```


## Documentation

### Class: Scope

Create a `Scope` from Lain (which is the root `Scope`) or another `Scope` using the `createChild` method.

#### Methods

* `createChild([name])` Create a new child scope.
* `children()` Returns an array (shallow copy) of child scopes.
* `clear()` Destroys all elements and children within the scope, effectively resetting it.
* `destroy()` Destroys the scope and everything within it.
* `data(name)` Gets or creates a local `Data` instance with the given name.
* `action(name)` Gets or creates a local `Data` instance. It is stateless and will emit but not store values.
* `state(name)` Gets or creates a local `Data` instance. It is read-only when accessed from any child scope.
* `find(name)` Searches for a `Data` instance in the current scope and then continues searching up the scope tree.
Returns `null` if no matches are found or if the search is blocked by a valve.
* `reside(destructible, [destructor])` Ties the lifecycle of a destructible object to the scope. When the scope is destroyed or cleared,
the destructible's destroy (or dispose as a fallback) method will be called. An alternate destructor method can be specified as well.

* `insertParent(scope)` Inserts a scope between this scope and its parent scope.
* `setParent(scope)` Assigns a parent scope to the current scope, removing its original parent (if any).
Scopes can be orphan via setParent(null).
* `flatten()` Creates a hash of all `Data` instances accessible to the current scope.
* `here()` Creates a hash of all `Data` instances in the current scope. (not yet implemented)
* `findDataSet(names)` Creates a hash of `Data` instances found through the current scope using the given names.
* `readDataSet(names)` Like findDataSet -- but returns the message values instead of the `Data` instances.





### Class: Data

Something about the Data class.

#### Methods

* `read([topic])`
* `write(msg, [topic])`
* `toggle([topic])`
* `refresh([topic])`
* `subscribe([topic])`
* `follow([topic])`
* `monitor()`


### Class: Packet

Something about the Data class.

#### Properties

* `msg` Message content written to a `Data` instance.
* `topic` Subscription topic that created the packet (the default is `null`).
* `source` Name of the `Data` instance that created the packet.
* `timestamp` Date.now() when created.




## License
Copyright (c) 2016 Scott Southworth & Contributors
Licensed under the Apache 2.0 license.















