# Lain.js

A PubSub Data Store designed for Inversion of Access (where encapsulation is defined from above).

Lain is a data storage tree composed of observable scopes.

Lain itself is an instance of Scope.

Variables within a ```Scope``` are defined using the ```Data``` class.

Each ```Data``` instance can contain a single value or be used as a pub/sub system with topic channels.

```Data``` can be declared as an ```Action``` that publishes but does not hold its last value.
```Data``` can also be declared as a ```State``` that is read-only from any child ```Scope```.


Each ```Scope``` can contain

var world = Lain.createChild();
var ocean = world.createChild();
