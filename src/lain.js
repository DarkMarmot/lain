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

    function Lain(){
        this._root = new Scope('LAIN');
    }

    Lain.prototype.createChild = function(name){
        return this._root.createChild(name);
    };

    Lain.prototype.clear = function(){
        this._root.clear();
    };

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
        this.children = [];
        this.dimensions = {data: {}}; // by dimension then data name
        this.valves = {}; // by dimension then data name
        this.plugs = {}; // by dimension then data name
        this.destructibles = []; // list of items to destroy with scope
        this.destructors = []; // list of matching destructor methods
        this.dead = false;

    }

    // assign an object to be destroyed with this scope
    // it should have a destructor method (by default destroy or dispose will be called)
    // you can specify a method by name (string) or via a reference function

    Scope.prototype.assign = function(destructible, method){

        if(typeof  destructible !== 'object' && typeof  destructible !== 'function'){
            throw new Error('Scope.assign requires an object with a destroy of dispose method.');
        }

        if(typeof method === 'string'){
            method = destructible[method];
        }

        if(!method) {
            method = destructible.destroy || destructible.dispose;
        }

        if(!method || typeof  method !== 'function'){
            throw new Error('Scope.assign requires an object with a destroy of dispose method.');
        }

        this.destructibles.push(destructible);
        this.destructors.push(method);

    };

    Scope.prototype._reset = function(){

        this.children = [];
        this.dimensions = {data: {}};
        this.valves = {};
        this.plugs = {};
        this.destructibles = [];
        this.destructors = [];

    };

    Scope.prototype._destroyContents = function(){

        var i, len;

        if(this.dead)
            return;

        var children = this.children;
        len = children.length;

        for(i = 0; i < len; i++){
            var child = children[i];
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

    Scope.prototype.clear = function(toDestroy){

        this._destroyContents();
        this._reset();

    };

    Scope.prototype._nullify = function(){

        this.dimensions = null;
        this.destructibles = null;
        this.destructors = null;
        this.children = null;
        this.valves = null;
        this.plugs = null;
        this.parent = null;

    };

    Scope.prototype.destroy = function(){

        this._destroyContents();
        this._nullify();
        this.dead = true;

    };


    Scope.prototype.createChild = function(name){

        var child = new Scope(name);
        child.assignParent(this);
        return child;

    };

    Scope.prototype.insertParent = function(newParent){

        var oldParent = this.parent;
        newParent.assignParent(oldParent);
        this.assignParent(newParent);
        return this;

    };

    Scope.prototype.assignParent = function(newParent){

        var oldParent = this.parent;

        if(oldParent === newParent)
            return;

        if(oldParent) {
            var at = oldParent.children.indexOf(this);
            oldParent.children.splice(at, 1);
        }

        this.parent = newParent;

        if(newParent) {
            newParent.children.push(this);
        }
        
        return this;

    };

    Scope.prototype.setValves = function(names, dimension){

        dimension = dimension || 'data';
        this.valves[dimension] = names;

    };

    Scope.prototype.addValve = function(name, dimension){

        dimension = dimension || 'data';
        var list = this.valves[dimension] = this.valves[dimension] || [];
        list.push(name);

    };

    Scope.prototype.setPlugs = function(names, dimension){

        dimension = dimension || 'data';
        this.plugs[dimension] = names;

    };

    Scope.prototype.addPlug = function(name, dimension){

        dimension = dimension || 'data';
        var list = this.plugs[dimension] = this.plugs[dimension] || [];
        list.push(name);

    };


    Scope.prototype.demandDimension = function(dimension){

        return this.dimensions[dimension] = this.dimensions[dimension] || {};

    };

    Scope.prototype.demandData = function(name, dimension, ephemeral){

        dimension = dimension || 'data';
        var dataByName = this.demandDimension(dimension);
        var data = dataByName[name];

        if(!data) {

            data = new Data(this, name, dimension, ephemeral);
            dataByName[name] = data;

        }

        return data;

    };

    Scope.prototype.findData = function(name, dimension){

        dimension = dimension || 'data';

        var localData = this.getData(name, dimension);
        if(localData)
            return localData;

        var parent = this.parent;

        while(parent){

            var valves = parent.valves;
            var plugs = parent.plugs;

            var whiteList = valves[dimension];
            var blackList = plugs[dimension];

            // if a valve exists and the name is not white-listed, return null
            if(whiteList && !whiteList[name])
                return null;

            if(blackList && blackList[name])
                return null;

            var d = parent.getData(name, dimension);
            if(d)
                return d;
            parent = parent.parent;
        }

        return null;

    };


    Scope.prototype.getData = function(name, dimension) {
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


    SubscriberList.prototype.tell = function(msg, topic){

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

    SubscriberList.prototype.destroy = function(){

        if(this.dead) return;

        this.subscribers = null;
        this.lastPacket = null;
        this.dead = true;

    };

    SubscriberList.prototype.add = function(watcher){

        this.subscribers.push(watcher);

    };

    SubscriberList.prototype.remove = function(watcher){

        var i = this.subscribers.indexOf(watcher);

        if(i !== -1)
            this.subscribers.splice(i, 1);

    };


    var Data = function(scope, name, dimension, ephemeral) {

        scope.assign(this, this.destroy);
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

    Data.prototype.destroy = function(){

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


    Data.prototype.demandSubscriberList = function(topic){

        var df = this.subscriberListsByTopic[topic];

        if(df)
            return df;

        return this.subscriberListsByTopic[topic] = new SubscriberList(topic, this);

    };

    Data.prototype.subscribe = function(watcher, topic){

        if(!topic){
            this.noTopicSubscriberList.add(watcher);
        } else {
            var subscriberList = this.demandSubscriberList(topic);
            subscriberList.add(watcher);
        }

    };

    Data.prototype.monitor = function(watcher){
        this.wildcardSubscriberList.add(watcher);
    };


    Data.prototype.drop = function(watcher, topic){

        if(!topic){
            this.noTopicSubscriberList.remove(watcher);
        } else {
            var subscriberList = this.demandSubscriberList(topic);
            subscriberList.remove(watcher);
        }
        this.wildcardSubscriberList.remove(watcher);

    };


    Data.prototype.peek = function(topic){


        var subscriberList = topic ? this.subscriberListsByTopic[topic] : this.noTopicSubscriberList;
        if(!subscriberList)
            return null;
        return subscriberList.lastPacket;

    };

    Data.prototype.read = function(topic) {

        var packet = this.peek(topic);
        return (packet) ? packet.msg : undefined;

    };


    Data.prototype.write = function(msg, topic){

        
        if(topic) {
            var list = this.demandSubscriberList(topic);
            list.tell(msg);
        }
        else {
            this.noTopicSubscriberList.tell(msg);
        }
        
        this.wildcardSubscriberList.tell(msg, topic);

    };

    
    Data.prototype.refresh = function(topic){
        this.write(this.read(topic), topic);
    };

    
    Data.prototype.toggle = function(topic){
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
