/**
 * lain.js (v1.0.0) --
 *
 * Copyright (c) 2016 Scott Southworth & Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this
 * file except in compliance with the License. You may obtain a copy of the License at:
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
 * ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 *
 * @authors Scott Southworth @darkmarmot
 *
 */

;(function(){

    "use strict";

    var idCounter = 0;
    var DEFAULT_DIMENSION = 'data';

    var Lain = new Scope('LAIN');

    function Packet(msg, topic, source){

        this.msg = msg;
        this.topic = topic;
        this.source = source;
        this.timestamp = Date.now();

    }

    function Scope(name) {

        this._id = ++idCounter;
        this._name = name;
        this._fixedDimension = null;
        this._innerScope = null;
        this._parent = null;
        this._children = [];
        this._dimensions = {}; // by dimension then data name
        this._dimensions[DEFAULT_DIMENSION] = {};
        this._valves = {}; // by dimension then data name
        this._mirrors = {}; // by dimension then data name
        this._destructibles = []; // list of items to destroy with scope
        this._destructors = []; // list of matching destructor methods
        this._dead = false;

    }

    var Sp = Scope.prototype;

    Sp.dimension = function(name){

        if(!name)
            return this._fixedDimension ? this._innerScope : this;

        if(this._fixedDimension){
            this._fixedDimension = name;
            return this;
        } else {
            var wrappedScope = Object.create(this);
            wrappedScope._fixedDimension = name;
            wrappedScope._innerScope = this;
            return wrappedScope;
        }

    };

    // set an object as residing in this scope (to be destroyed with it)
    // it should have a destructor method (by default destroy or dispose will be called)
    // you can specify a method by name (string) or via a reference function

    Sp.reside = function(destructible, method){

        if(typeof  destructible !== 'object' && typeof  destructible !== 'function'){
            throw new Error('Scope.reside requires an object with a destroy of dispose method.');
        }

        if(typeof method === 'string'){
            method = destructible[method];
        }

        if(!method) {
            method = destructible.destroy || destructible.dispose;
        }

        if(!method || typeof  method !== 'function'){
            throw new Error('Scope.reside requires an object with a destroy of dispose method.');
        }

        this._destructibles.push(destructible);
        this._destructors.push(method);

    };

    Sp._reset = function(){

        this._children = [];
        this._dimensions = {data: {}};
        this._valves = {};
        this._mirrors = {};
        this._destructibles = [];
        this._destructors = [];

    };

    Sp.children = function(){

        var result = [];
        var _children = this._children;
        var len = _children.length;

        for(var i = 0; i < len; i++){
            var child = _children[i];
            result.push(child);
        }

        return result;

    };

    Sp._destroyContents = function(){

        var i, len;

        if(this._dead)
            return;

        var _children = this._children;
        len = _children.length;

        for(i = 0; i < len; i++){
            var child = _children[i];
            child.destroy();
        }

        var destructibles = this._destructibles;
        var destructors = this._destructors;

        len = destructibles.length;
        for(i = 0; i < len; i++){
            var d = destructibles[i];
            var m = destructors[i];
            m.call(d);
        }


    };

    // wipes everything in the scope, reset and ready for new data and _children
    Sp.clear = function(){

        this._destroyContents();
        this._reset();

    };

    Sp._nullify = function(){

        this._dimensions = null;
        this._destructibles = null;
        this._destructors = null;
        this._children = null;
        this._valves = null;
        this._parent = null;

    };

    // wipes everything in the scope, dead and ready for disposal
    Sp.destroy = function(){

        this._destroyContents();
        this._nullify();
        this.setParent(null);
        this._dead = true;

    };

    
    
    Sp.createChild = function(name){

        var child = new Scope(name);
        child.setParent(this);
        return child;

    };

    Sp.insertParent = function(newParent){

        var oldParent = this._parent;
        newParent.setParent(oldParent);
        this.setParent(newParent);
        return this;

    };

    Sp.setParent = function(newParent){

        var oldParent = this._parent;

        if(oldParent === newParent)
            return;

        if(oldParent) {
            var at = oldParent._children.indexOf(this);
            oldParent._children.splice(at, 1);
        }

        this._parent = newParent;

        if(newParent) {
            newParent._children.push(this);
        }
        
        return this;

    };

    Sp.setValves = function(names, dimension){

        dimension = dimension || this._fixedDimension || DEFAULT_DIMENSION;
        var valves = this._valves[dimension] = this._valves[dimension] || {};
        var len = names.length;
        for(var i = 0; i < len; i++){
            var name = names[i];
            valves[name] = true;
        }

        return this;
    };


    Sp.valve = function(name, dimension){

        dimension = dimension || this._fixedDimension || DEFAULT_DIMENSION;
        var valves = this._valves[dimension] = this._valves[dimension] || {};
        return valves[name] = true;

    };


    Sp.mirror = function(name, dimension){

        dimension = dimension || this._fixedDimension || DEFAULT_DIMENSION;
        var mirrors = this._mirrors[dimension] = this._mirrors[dimension] || {};

        var existingMirror = mirrors[name];
        if(existingMirror)
            return existingMirror;

        var original = this.find(name, dimension);
        var mirror = mirrors[name] = Object.create(original);
        mirror._readOnly = true;
        return mirror;

    };


    Sp.data = function(name, dimension){

        dimension = dimension || this._fixedDimension || DEFAULT_DIMENSION;
        var dataByName = this._dimensions[dimension] = this._dimensions[dimension] || {};
        var data = dataByName[name];

        if(!data) {

            data = new Data(this, name, dimension);
            dataByName[name] = data;

        } // todo else if action or state barf

        return data;

    };


    Sp.action = function(name, dimension){
        // todo else if data or state barf
        var d = this.data(name, dimension);
        d._writeOnly = true;
        return d;
    };


    Sp.state = function(name, dimension){
        // todo else if mirror or data barf
        var d = this.data(name, dimension);
        this.mirror(name, dimension);
        return d;
    };


    Sp.findDataSet = function(names, dimension){

        dimension = dimension || this._fixedDimension || DEFAULT_DIMENSION;

        var len = names.length;
        var result = {};
        for(var i = 0; i < len; i++){
            var name = names[i];
            result[name] = this.find(name, dimension);
        }

        return result;

    };

    Sp.readDataSet = function(names, dimension){

        var dataSet = this.findDataSet(names, dimension);
        var result = {};
        for(var name in dataSet){
            var d = dataSet[name];
            var lastPacket = d && d.peek();
            if(lastPacket)
                result[name] = lastPacket.msg;
        }

        return result;

    };

    // created a flattened view of all data at and above this scope

    Sp.flatten = function(dimension){

        dimension = dimension || this._fixedDimension || DEFAULT_DIMENSION;

        var result = {};
        var whitelist = null;

        var dataByName = this._dimensions[dimension] || {};
        var dataName;

        for(dataName in dataByName){
            result[dataName] = dataByName[dataName];
        }

        var scope = this;
        var valveName;
        var data;

        while(scope = scope._parent){

            dataByName = scope._dimensions[dimension] || {};
            var valves = scope._valves[dimension];
            var mirrors = scope._mirrors;
            var mirrorList = mirrors[dimension];

            // further restrict whitelist with each set of valves

            if(valves){
                if(whitelist){
                    for(valveName in whitelist){
                        whitelist[valveName] = whitelist[valveName] && valves[valveName];
                    }
                } else {
                    whitelist = {};
                    for(valveName in valves){
                        whitelist[valveName] = valves[valveName];
                    }
                }
            }

            if(whitelist){
                for(dataName in whitelist){
                    if(!result[dataName]) {
                        data = (mirrorList && mirrorList[dataName]) || dataByName[dataName];
                        result[dataName] = data;
                    }
                }
            } else {
                for(dataName in dataByName){
                    if(!result[dataName]) {
                        data = (mirrorList && mirrorList[dataName]) || dataByName[dataName];
                        result[dataName] = data;
                    }
                }
            }

        }


        return result;

    };


    Sp.find = function(name, dimension){

        dimension = dimension || this._fixedDimension || DEFAULT_DIMENSION;

        var localData = this.grab(name, dimension);
        if(localData)
            return localData;

        var scope = this;

        while(scope = scope._parent){

            var valves = scope._valves;
            var whiteList = valves[dimension];

            // if a valve exists and the name is not white-listed, return null
            if(whiteList && !whiteList[name])
                return null;

            var mirrors = scope._mirrors;
            var mirrorList = mirrors[dimension];
            var mirroredData = mirrorList && mirrorList[name];

            if(mirroredData)
                return mirroredData;

            var d = scope.grab(name, dimension);
            if(d)
                return d;

        }

        return null;

    };


    Sp.grab = function(name, dimension) {

        dimension = dimension || this._fixedDimension || DEFAULT_DIMENSION;
        var dataByName = this._dimensions[dimension];
        if(!dataByName)
            return null;
        return dataByName[name] || null;

    };


    // holds subscriptions for a topic on a data element
    var SubscriberList = function(topic, data) {

        this._topic = topic;
        this._subscribers = [];
        this.lastPacket = null;
        this.data = data;
        this._name = data._name;
        this._dead = false;

    };

    var Slp = SubscriberList.prototype;

    Slp.tell = function(msg, topic){

        if(this._dead) return;

        topic = topic || this._topic;
        var source = this._name;
        var currentPacket = new Packet(msg, topic, source);

        if(!this.data._writeOnly)
            this.lastPacket = currentPacket;

        var subscribers = [].concat(this._subscribers); // call original sensors in case subscriptions change mid loop
        var len = subscribers.length;

        for(var i = 0; i < len; i++){
            var s = subscribers[i];
            typeof s === 'function' ? s.call(s, msg, currentPacket) : s.tell(msg, currentPacket);
        }

    };

    Slp.destroy = function(){

        if(this._dead) return;

        this._subscribers = null;
        this.lastPacket = null;
        this._dead = true;

    };

    Slp.add = function(watcher){

        this._subscribers.push(watcher);

    };

    Slp.remove = function(watcher){

        var i = this._subscribers.indexOf(watcher);

        if(i !== -1)
            this._subscribers.splice(i, 1);

    };

    var Data = function(scope, name, dimension) {

        scope.reside(this, this.destroy);
        this._dimension = dimension;
        this._scope = scope;
        this._writeOnly = false;
        this._name = name;
        this._readOnly = false;
        this._noTopicSubscriberList = new SubscriberList(null, this);
        this._wildcardSubscriberList = new SubscriberList(null, this);
        this._subscriberListsByTopic = {};

        this._dead = false;

    };

    var Dp = Data.prototype;

    Dp.dimension = function(){
        return this._dimension;
    };

    Dp.name = function(){
       return this._name;
    };

    Dp.dead = function(){
        return this._dead;
    };

    Dp.scope = function(){
        return this._scope;
    };

    Dp.destroy = function(){

        if(this._dead)
            return;

        var subscriberListsByTopic = this._subscriberListsByTopic;
        for(var topic in subscriberListsByTopic){
            var list = subscriberListsByTopic[topic];
            list.destroy();
        }

        this._scope = null;
        this._noTopicSubscriberList = null;
        this._wildcardSubscriberList = null;
        this._subscriberListsByTopic = null;

        this._dead = true;

    };


    Dp._demandSubscriberList = function(topic){

        var df = this._subscriberListsByTopic[topic];

        if(df)
            return df;

        return this._subscriberListsByTopic[topic] = new SubscriberList(topic, this);

    };

    Dp.follow = function(watcher, topic){

        this.subscribe(watcher, topic);
        var packet = this.peek();

        if(packet)
            typeof watcher === 'function' ? watcher.call(watcher, packet.msg, packet) : watcher.tell(packet.msg, packet);

        return this;

    };

    Dp.subscribe = function(watcher, topic){

        var subscriberList = (!topic) ? this._noTopicSubscriberList : this._demandSubscriberList(topic);
        subscriberList.add(watcher);

    };

    Dp.monitor = function(watcher){

        this._wildcardSubscriberList.add(watcher);

    };


    Dp.drop = function(watcher, topic){

        if(!topic){
            this._noTopicSubscriberList.remove(watcher);
        } else {
            var subscriberList = this._demandSubscriberList(topic);
            subscriberList.remove(watcher);
        }
        this._wildcardSubscriberList.remove(watcher);

    };


    Dp.peek = function(topic){

        var subscriberList = topic ? this._subscriberListsByTopic[topic] : this._noTopicSubscriberList;
        if(!subscriberList)
            return null;
        return subscriberList.lastPacket;

    };

    Dp.read = function(topic) {

        var packet = this.peek(topic);
        return (packet) ? packet.msg : undefined;

    };


    Dp.write = function(msg, topic){

        if(this._readOnly)
            throw(new Error('Data from a mirror is read-only.'));

        if(topic) {
            var list = this._demandSubscriberList(topic);
            list.tell(msg);
        }
        else {
            this._noTopicSubscriberList.tell(msg);
        }
        
        this._wildcardSubscriberList.tell(msg, topic);

    };

    
    Dp.refresh = function(topic){
        this.write(this.read(topic), topic);
    };

    
    Dp.toggle = function(topic){
        this.write(!this.read(topic), topic);
    };


    var plugins = typeof seele !== 'undefined' && seele;
    if(plugins)
        plugins.register('lain', Lain, true);
    else if ((typeof define !== "undefined" && define !== null) && (define.amd != null)) {
        define([], function() {
            return Lain;
        });
    } else if ((typeof module !== "undefined" && module !== null) && (module.exports != null)) {
        module.exports = Lain;
    } else {
        this.Lain = Lain;
    }

    return this;


}).call(this);
