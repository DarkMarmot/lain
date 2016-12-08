# Lain.js

Lain is an in-memory data store whose structure is composed at run-time. It is most suitable for applications that are composed incrementally with extremely loose-coupling and many external modules.

It acts as tree of observable scopes. Instead of relying on functional or lexical scopes inherent to a programming language, Lain lets you create a scope hierarchy on the fly. This allows the simple creation of component or module-based scopes.

Lain is primarily designed to be used as a library for other libraries (as it lacks data-flow or data-binding mechanisms other than pub/sub).

## Usage

First, let's create some scopes (imagining that they correspond to components on a web page).

```javascript

var appScope = Lain.createChild(); // creates a top-level scope
var pageScope = appScope.createChild();
var menuScope = pageScope.createChild();
var buttonScope = pageScope.createChild();

```

Each of these scopes can hold named instances of the `Data` class.

```javascript

var country = appScope.data('country'); // returns an empty instance of class Data
country.write('Japan'); // stores the string 'Japan'

```

Grab a reference to a `Data` instance in the current scope with the `grab` method.

```javascript

var sameCountry = appScope.grab('country'); // returns the Data instance containing 'Japan'

```

`Data` defined in higher scopes can be accessed using `Scope.find`.

```javascript

buttonScope.find('country').read(); // returns 'Japan'

```


Scopes can override `Data` instances, blocking access to `Data` of the same name in higher scopes, as is typical in most programming languages.


```javascript

pageScope.data('country').write('Russia');
appScope.data('country').write('Argentina');
buttonScope.find('country').read(); // returns 'Russia' since pageScope is found before the appScope
buttonScope.find('country').write('France'); // can overwrite the stored value

```

The default Data instance allows read and write access from its local and descendant scopes.

```javascript

buttonScope.find('country').write('France'); // can overwrite the stored value
menuScope.find('country').read(); // returns 'France' now when accessed from a sister scope

```

Additionally, scopes can specify that variables (represented via the `Data` class) act as states or actions.

```javascript

appScope.action('navigate');

var url = pageScope.state('url');
pageScope.find('navigate').subscribe(function(msg){
    url.write(msg + '.html');
});

```

States can only be updated in their local scope and are read-only from lower scopes.

```javascript

pageScope.find('url').write('cat.html'); // updates successfully
menuScope.find('url').write('cat.html'); // throws an Error since it is read-only from the child scope


```

Actions can be updated such that they emit their values, but they do not retain them and are thus stateless.

```javascript

pageScope.find('navigate').write('bunny'); // updates subscribers

menuScope.find('url').read(); // returns 'cat.html'

// peek() returns the last Packet instance
// {msg: 'cat.html', topic: null, source: 'url', timestamp: Date.now()}

menuScope.find('url').peek();

menuScope.find('navigate').read(); // returns `undefined`
menuScope.find('navigate').peek(); // returns `null`

```

Every Data instance can treated as a discrete value or as a full pub/sub channel with subscriptions or values available by topic (via the `subscribe` method).

```javascript

var fields = appScope.data('fields');

fields.write('three fields here'); // stored on the default `null` topic
fields.write('bunny', 'animal'); // 'bunny' stored on the 'animal' topic
fields.write('grass', 'food'); // 'bunny' stored on the 'food' topic

fields.subscribe('animal', function(msg, packet){
    console.log(msg, packet.topic);
};

// the callback is not invoked until something new is written
fields.write('elephant', 'animal'); // writes to the console now

```

The `follow` method acts just like `subscribe` but will also emit the current state of the `Data` instance (if present) when invoked.

```javascript

// the callback here is invoked immediately with the stored value and the last stored Packet
fields.follow('animal', function(msg, packet){
    console.log(msg, packet.topic);
};


```


Updates across all topics (essential for debugging this pattern) can be accessed using the `monitor` method (basically a wildcard subscription).

```javascript

fields.monitor(function(msg, packet){
    console.log(packet.topic + ':' + msg);
};

fields.write('cat', 'animal'); // logs: 'animal:cat'
fields.write('mice', 'food');  // logs: 'food:mice'
fields.write('house');         // logs: 'null:house'

```

To sandbox its descendant scopes, a scope can declare a white-list of available variable names (referred to as valves).
Valves allow subscriptions to be mediated through 'inversion of access' (where encapsulation is declared from above).

```javascript

appScope.data('color').write('red');
appScope.data('shadow').write('blue');
appScope.data('mixture').write('purple');

pageScope.valves(['color','shadow'); // allows access to only 'color' and 'shadow' `Data` from lower scopes

pageScope.find('color'); // returns the `Data` instance containing 'red'
pageScope.find('mixture'); // returns the `Data` instance containing 'purple'

buttonScope.find('color'); // returns the `Data` instance containing 'red'
buttonScope.find('mixture'); // returns null due to the valves in pageScope


```

To create parallel hierarchies of data with the same inherent structure but different access properties (useful for separating things like source file information, styles, api methods, etc.), scopes can declare that Data elements reside in a specific dimension (like a namespace of sorts). Valves can be defined separately for each dimension.

```javascript

// this returns an appScope instance that accesses data stored in a 'style' namespace
var styles = appScope.dimension('style');

styles.data('shadow').write('blue');

buttonScope.find('shadow'); // returns null
buttonScope.dimension('style').find('shadow'); // returns the `Data` instance containing 'blue'


```

Valves can be configured separately for each dimension, allowing flexible white-listing.

```javascript

// this returns an appScope instance that accesses data stored in a 'style' namespace
var styles = appScope.dimension('style');

styles.data('background').write('red');
styles.data('shadow').write('blue');
styles.data('mixture').write('purple');

buttonScope.find('shadow'); // returns null
buttonScope.dimension('style').find('shadow'); // returns the `Data` instance containing 'blue'


pageScope.valves(['color','shadow'); // allows access to only 'color' and 'shadow' `Data` from lower scopes

pageScope.find('color'); // returns the `Data` instance containing 'red'
pageScope.find('mixture'); // returns the `Data` instance containing 'purple'

buttonScope.find('color'); // returns the `Data` instance containing 'red'
buttonScope.find('mixture'); // returns null due to the valves in pageScope


```


## Installation
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

* `createChild([name])` Create a new child scope. The name property is just cosmetic (for debugging).
* `children()` Returns an array (shallow copy) of child scopes.
* `clear()` Destroys all elements and children within the scope, effectively resetting it.
* `destroy()` Destroys the scope and everything within it.
* `data(name, [dimension])` Gets or creates a local `Data` instance with the given name.
* `action(name, [dimension])` Gets or creates a local `Data` instance configured as an action. It is stateless and will emit but not store values.
* `state(name, [dimension])` Gets or creates a local `Data` instance configured as a state. It is read-only when accessed from any child scope.
* `grab(name, [dimension])` Returns a local `Data` instance (data, state or action) or `null` if not present.
* `find(name, [dimension])` Searches for a `Data` instance in the current scope and then continues searching up the scope tree.
Returns `null` if no matches are found or if the search is blocked by a valve.
* `reside(destructible, [destructor])` Ties the lifecycle of a destructible object to the scope. When the scope is destroyed or cleared,
the destructible's destroy (or dispose) method will be called. An alternate destructor method can be specified as well.

* `insertParent(scope)` Inserts a scope between this scope and its parent scope.
* `setParent(scope)` Assigns a parent scope to the current scope, removing its original parent (if any).
Scopes can be orphan via setParent(null).
* `flatten([dimension])` Creates a hash of all `Data` instances accessible to the current scope.
* `here([dimension])` Creates a hash of all `Data` instances in the current scope. (not yet implemented)
* `findDataSet(names, [dimension])` Creates a hash of `Data` instances found through the current scope using the given names.
* `readDataSet(names, [dimension])` Like findDataSet -- but returns the message values instead of the `Data` instances.
* `dimension([name])` Returns the current scope with a wrapper accessing the specified dimension.


### Class: Data

Something about the Data class.

#### Methods

* `read([topic])` Returns the last `msg` written to the topic (or `undefined` if never used).
* `write(msg, [topic])` Write a `msg` value to be stored (on the topic if specified). This will immediately notify any subscribers.
* `toggle([topic])` Toggles the boolean `msg` value of the instance (writing `!msg`).
* `refresh([topic])` Notifies all subscribers of the current `msg` value.
* `subscribe(watcher, [topic])` Subscribes to the `Data` instance. `watcher` can be a function or object with a `tell` method like `function(msg, packet)`.
* `follow(watcher, [topic])` Subscribes and immediately emits the current `msg` and `packet` values if present.
* `monitor(watcher)` Subscribes to all topics on the `Data` instance (including topics added later).
* `name()` Returns the instance name
* `dimension()` Returns the dimension (defaults to 'data')
* `dead()` Returns true if the instance has been destroyed.
* `destroy()` Removes and destroys the instance and its subscriptions


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















