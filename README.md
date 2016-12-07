# Lain.js

Lain is an in-memory data store whose structure is composed at run-time. It is most suitable for applications that are composed incrementally with extremely loose-coupling and many external modules.

Lain is primarily designed to be used as a library for other libraries (as it lacks any advanced data-flow or data-binding mechanisms). Lain does have a simple pub/sub system available, though.

It acts as tree of observable scopes. Instead of relying on functional or lexical scopes inherent to a programming language, Lain lets you create a scope hierarchy on the fly. This allows the simple creation of component or module-based scopes.

Scopes can redefine variable, blocking access to variables of the same name in higher scopes, as is typical in most programming languages.

Additionally, scopes can specify that variables (represented via the Data class) act as states or actions.

States can be updated in their local scope and are read-only from lower scopes.

Actions can be updated such that they emit their values, but they do not retain them and are thus stateless.

The default Data instance allows read and write access from its local and descendant scopes.

Every Data instance can treated as a discrete value or as a full pub/sub channel with subscriptions or values available by topic (via the `subscribe` method). The `follow` method acts just like `subscribe` but will also emit the current state of the `Data` instance if it has been written to previously.
Updates across all topics (essential for debugging this pattern) can be accessed using the `monitor` method (basically a wildcard subscription).

To limit the logical access of child scopes (possibly acting as a sandbox for loaded content), a scope can declare a white-list of variable names available to its descendants (referred to as valves).
Valves allow subscriptions to be mediated through 'inversion of access' (where encapsulation is declared from above).

To create parallel hierarchies of data with the same inherent structure but different access properties (useful for separating things like source file information, api methods, etc.), scopes can declare that Data elements reside in a specific dimension (like a namespace of sorts).


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















