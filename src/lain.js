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

    var Lain = new Scope('LAIN');

    function Packet(msg, topic, source){

        this.msg = msg;
        this.topic = topic;
        this.source = source;
        this.timestamp = Date.now();

    }

    function Scope(name) {

        this.id = ++idCounter;
        this._name = name;
        this.parent = null;
        this._children = [];
        this.dimensions = {data: {}}; // by dimension then data name
        this.valves = {}; // by dimension then data name
        this.mirrors = {}; // by dimension then data name
        this.destructibles = []; // list of items to destroy with scope
        this.destructors = []; // list of matching destructor methods
        this.dead = false;

    }

    var Sp = Scope.prototype;

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

        this.destructibles.push(destructible);
        this.destructors.push(method);

    };

    Sp._reset = function(){

        this._children = [];
        this.dimensions = {data: {}};
        this.valves = {};
        this.mirrors = {};
        this.destructibles = [];
        this.destructors = [];

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

        if(this.dead)
            return;

        var _children = this._children;
        len = _children.length;

        for(i = 0; i < len; i++){
            var child = _children[i];
            child.destroy();
        }

        var destructibles = this.destructibles;
        var destructors = this.destructors;

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

        this.dimensions = null;
        this.destructibles = null;
        this.destructors = null;
        this._children = null;
        this.valves = null;
        this.parent = null;

    };

    // wipes everything in the scope, dead and ready for disposal
    Sp.destroy = function(){

        this._destroyContents();
        this._nullify();
        this.setParent(null);
        this.dead = true;

    };

    
    
    Sp.createChild = function(name){

        var child = new Scope(name);
        child.setParent(this);
        return child;

    };

    Sp.insertParent = function(newParent){

        var oldParent = this.parent;
        newParent.setParent(oldParent);
        this.setParent(newParent);
        return this;

    };

    Sp.setParent = function(newParent){

        var oldParent = this.parent;

        if(oldParent === newParent)
            return;

        if(oldParent) {
            var at = oldParent._children.indexOf(this);
            oldParent._children.splice(at, 1);
        }

        this.parent = newParent;

        if(newParent) {
            newParent._children.push(this);
        }
        
        return this;

    };

    Sp.setValves = function(names, dimension){

        dimension = dimension || 'data';
        var valves = this.valves[dimension] = this.valves[dimension] || {};
        var len = names.length;
        for(var i = 0; i < len; i++){
            var name = names[i];
            valves[name] = true;
        }

        return this;
    };


    Sp.valve = function(name, dimension){

        dimension = dimension || 'data';
        var valves = this.valves[dimension] = this.valves[dimension] || {};
        return valves[name] = true;

    };


    Sp.mirror = function(name, dimension){

        dimension = dimension || 'data';
        var mirrors = this.mirrors[dimension] = this.mirrors[dimension] || {};

        var existingMirror = mirrors[name];
        if(existingMirror)
            return existingMirror;

        var original = this.find(name, dimension);
        return mirrors[name] = new Mirror(this, original);


    };


    Sp.data = function(name, dimension, ephemeral){

        dimension = dimension || 'data';
        var dataByName = this.dimensions[dimension] = this.dimensions[dimension] || {};
        var data = dataByName[name];

        if(!data) {

            data = new Data(this, name, dimension, ephemeral);
            dataByName[name] = data;

        } // todo else if action or state barf

        return data;

    };


    Sp.action = function(name, dimension){
        // todo else if data or state barf
        return this.data(name, dimension, true);
    };


    Sp.state = function(name, dimension){
        // todo else if mirror or data barf
        var d = this.data(name, dimension);
        this.mirror(name, dimension);
        return d;
    };


    Sp.findDataSet = function(names, dimension){

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

        dimension = dimension || 'data';

        var result = {};
        var whitelist = null;

        var dataByName = this.dimensions[dimension] || {};
        var dataName;

        for(dataName in dataByName){
            result[dataName] = dataByName[dataName];
        }

        var scope = this;
        var valveName;
        var data;

        while(scope = scope.parent){

            dataByName = scope.dimensions[dimension] || {};
            var valves = scope.valves[dimension];
            var mirrors = scope.mirrors;
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

        dimension = dimension || 'data';

        var localData = this.findLocal(name, dimension);
        if(localData)
            return localData;

        var scope = this;

        while(scope = scope.parent){

            var valves = scope.valves;
            var whiteList = valves[dimension];

            // if a valve exists and the name is not white-listed, return null
            if(whiteList && !whiteList[name])
                return null;

            var mirrors = scope.mirrors;
            var mirrorList = mirrors[dimension];
            var mirroredData = mirrorList && mirrorList[name];

            if(mirroredData)
                return mirroredData;

            var d = scope.findLocal(name, dimension);
            if(d)
                return d;

        }

        return null;

    };


    Sp.findLocal = function(name, dimension) {

        dimension = dimension || 'data';
        var dataByName = this.dimensions[dimension];
        if(!dataByName)
            return null;
        return dataByName[name] || null;

    };





    // holds subscriptions for a topic on a data element
    var SubscriberList = function(topic, data) {

        this.topic = topic;
        this.subscribers = [];
        this.lastPacket = null;
        this.data = data;
        this.ephemeral = data.ephemeral;
        this._name = data._name;
        this.dead = false;

    };

    var Slp = SubscriberList.prototype;

    Slp.tell = function(msg, topic){

        if(this.dead) return;

        topic = topic || this.topic;
        var source = this._name;
        var currentPacket = new Packet(msg, topic, source);

        if(!this.ephemeral)
            this.lastPacket = currentPacket;

        var subscribers = [].concat(this.subscribers); // call original sensors in case subscriptions change mid loop
        var len = subscribers.length;

        for(var i = 0; i < len; i++){
            var s = subscribers[i];
            typeof s === 'function' ? s.call(s, msg, currentPacket) : s.tell(msg, currentPacket);
        }

    };

    Slp.destroy = function(){

        if(this.dead) return;

        this.subscribers = null;
        this.lastPacket = null;
        this.dead = true;

    };

    Slp.add = function(watcher){

        this.subscribers.push(watcher);

    };

    Slp.remove = function(watcher){

        var i = this.subscribers.indexOf(watcher);

        if(i !== -1)
            this.subscribers.splice(i, 1);

    };

    var Data = function(scope, name, dimension, ephemeral) {

        scope.reside(this, this.destroy);
        this.scope = scope;
        this.ephemeral = !!ephemeral;
        this._name = name;

        this.noTopicSubscriberList = new SubscriberList(null, this);
        this.wildcardSubscriberList = new SubscriberList(null, this);

        this.subscriberListsByTopic = {}; 

        this.dead = false;

    };

    var Dp = Data.prototype;

    Dp.name = function(){
       return this._name;
    };

    Dp.ephemeral = function(){
        return this.ephemeral;
    };

    Dp.dead = function(){
        return this.dead;
    };

    Dp.scope = function(){
        return this.scope;
    };

    Dp.destroy = function(){

        if(this.dead)
            return;

        var subscriberListsByTopic = this.subscriberListsByTopic;
        for(var topic in subscriberListsByTopic){
            var list = subscriberListsByTopic[topic];
            list.destroy();
        }

        this.scope = null;
        this.noTopicSubscriberList = null;
        this.wildcardSubscriberList = null;
        this.subscriberListsByTopic = null;

        this.dead = true;

    };


    Dp.demandSubscriberList = function(topic){

        var df = this.subscriberListsByTopic[topic];

        if(df)
            return df;

        return this.subscriberListsByTopic[topic] = new SubscriberList(topic, this);

    };

    Dp.follow = function(watcher, topic){

        this.subscribe(watcher, topic);
        var packet = this.peek();

        if(packet)
            typeof watcher === 'function' ? watcher.call(watcher, packet.msg, packet) : watcher.tell(packet.msg, packet);

        return this;

    };

    Dp.subscribe = function(watcher, topic){

        var subscriberList = (!topic) ? this.noTopicSubscriberList : this.demandSubscriberList(topic);
        subscriberList.add(watcher);

    };

    Dp.monitor = function(watcher){

        this.wildcardSubscriberList.add(watcher);

    };


    Dp.drop = function(watcher, topic){

        if(!topic){
            this.noTopicSubscriberList.remove(watcher);
        } else {
            var subscriberList = this.demandSubscriberList(topic);
            subscriberList.remove(watcher);
        }
        this.wildcardSubscriberList.remove(watcher);

    };


    Dp.peek = function(topic){

        var subscriberList = topic ? this.subscriberListsByTopic[topic] : this.noTopicSubscriberList;
        if(!subscriberList)
            return null;
        return subscriberList.lastPacket;

    };

    Dp.read = function(topic) {

        var packet = this.peek(topic);
        return (packet) ? packet.msg : undefined;

    };


    Dp.write = function(msg, topic){

        if(topic) {
            var list = this.demandSubscriberList(topic);
            list.tell(msg);
        }
        else {
            this.noTopicSubscriberList.tell(msg);
        }
        
        this.wildcardSubscriberList.tell(msg, topic);

    };

    
    Dp.refresh = function(topic){
        this.write(this.read(topic), topic);
    };

    
    Dp.toggle = function(topic){
        this.write(!this.read(topic), topic);
    };

    // mirrors are read-only data proxies

    var Mirror = function(scope, data){

        scope.reside(this, this.destroy);
        this.scope = scope;
        this.readOnly = true;
        this._name = data.name;
        this.data = data;

        this.dead = false;
    };

    var Mp = Mirror.prototype;

    Mp.write = function(){
        throw(new Error('Data from a mirror is read-only.'));
    };

    Mp.read = function(topic){
        return this.data.read(topic);
    };

    Mp.peek = function(topic){
        return this.data.peek(topic);
    };

    Mp.drop = function(watcher, topic){
        if(!this.data.dead)
            this.data.drop(watcher, topic);
        return this;
    };

    Mp.monitor = function(watcher){
        this.data.monitor(watcher);
        return this;
    };

    Mp.subscribe = function(watcher, topic){
        this.data.subscribe(watcher, topic);
        return this;
    };

    Mp.follow = function(watcher, topic){
        this.data.follow(watcher, topic);
        return this;
    };

    Mp.destroy = function(){
        this.drop();
        this.data = null;
        this.dead = true;
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
