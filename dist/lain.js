/**
 * catbus.js (v4.0.0) --
 *
 * Copyright (c) 2016 Scott Southworth, Landon Barnickle, Nick Lorenson & Contributors
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
 * @authors Scott Southworth @darkmarmot, Landon Barnickle @landonbar, Nick Lorenson @enlore
 *
 */

;(function(){

    "use strict";

    // utility methods -- based on lodash


    function toNumber(n){
        return typeof n === 'number' ? n : 0;
    }

    function delay(func, wait) {

        var lastArgs,
            lastThis,
            result,
            timerId;

        if (typeof func != 'function') {
            //throw new TypeError(); todo make error here
        }

        wait = toNumber(wait);

        function invokeFunc() {

            var args = lastArgs,
                thisArg = lastThis;

            lastArgs = lastThis = undefined;
            result = func.apply(thisArg, args);
            return result;

        }

        function cancel() {
            if (timerId !== undefined) {
                clearTimeout(timerId);
            }
            lastArgs = lastThis = timerId = undefined;
        }

        function flush() {
            return timerId === undefined ? result : invokeFunc();
        }

        function delayed() {

            lastArgs = arguments;
            lastThis = this;

            timerId = setTimeout(invokeFunc, wait);

            return result;

        }

        delayed.cancel = cancel;
        delayed.flush = flush;
        return delayed;

    }

    function debounce(func, wait, options) {

        var lastArgs,
            lastThis,
            maxWait,
            result,
            timerId,
            lastCallTime,
            lastInvokeTime = 0,
            leading = false,
            maxing = false,
            trailing = true;

        if (typeof func != 'function') {
            //throw new TypeError(); todo make error here
        }

        wait = toNumber(wait);
        if (options && typeof options === 'object') {
            leading = !!options.leading;
            maxing = 'maxWait' in options;
            maxWait = maxing ? Math.max(toNumber(options.maxWait) || 0, wait) : maxWait;
            trailing = 'trailing' in options ? !!options.trailing : trailing;
        }

        function invokeFunc(time) {
            var args = lastArgs,
                thisArg = lastThis;

            lastArgs = lastThis = undefined;
            lastInvokeTime = time;
            result = func.apply(thisArg, args);
            return result;
        }

        function leadingEdge(time) {
            // Reset any `maxWait` timer.
            lastInvokeTime = time;
            // Start the timer for the trailing edge.
            timerId = setTimeout(timerExpired, wait);
            // Invoke the leading edge.
            return leading ? invokeFunc(time) : result;
        }

        function remainingWait(time) {
            var timeSinceLastCall = time - lastCallTime,
                timeSinceLastInvoke = time - lastInvokeTime,
                result = wait - timeSinceLastCall;

            return maxing ? Math.min(result, maxWait - timeSinceLastInvoke) : result;
        }

        function shouldInvoke(time) {
            var timeSinceLastCall = time - lastCallTime,
                timeSinceLastInvoke = time - lastInvokeTime;

            // Either this is the first call, activity has stopped and we're at the
            // trailing edge, the system time has gone backwards and we're treating
            // it as the trailing edge, or we've hit the `maxWait` limit.
            return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
            (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
        }

        function timerExpired() {
            var time = Date.now();
            if (shouldInvoke(time)) {
                return trailingEdge(time);
            }
            // Restart the timer.
            timerId = setTimeout(timerExpired, remainingWait(time));
        }

        function trailingEdge(time) {
            timerId = undefined;

            // Only invoke if we have `lastArgs` which means `func` has been
            // debounced at least once.
            if (trailing && lastArgs) {
                return invokeFunc(time);
            }
            lastArgs = lastThis = undefined;
            return result;
        }

        function cancel() {
            if (timerId !== undefined) {
                clearTimeout(timerId);
            }
            lastInvokeTime = 0;
            lastArgs = lastCallTime = lastThis = timerId = undefined;
        }

        function flush() {
            return timerId === undefined ? result : trailingEdge(Date.now());
        }

        function debounced() {
            var time = now(),
                isInvoking = shouldInvoke(time);

            lastArgs = arguments;
            lastThis = this;
            lastCallTime = time;

            if (isInvoking) {
                if (timerId === undefined) {
                    return leadingEdge(lastCallTime);
                }
                if (maxing) {
                    // Handle invocations in a tight loop.
                    timerId = setTimeout(timerExpired, wait);
                    return invokeFunc(lastCallTime);
                }
            }
            if (timerId === undefined) {
                timerId = setTimeout(timerExpired, wait);
            }
            return result;
        }
        debounced.cancel = cancel;
        debounced.flush = flush;
        return debounced;
    }


    var Catbus = {};
    var externalContext = this;

    

    function createFunctor(val) {
        return (typeof val === 'function') ? val : function() { return val; };
    }


    Catbus.uid = 0;
    Catbus.primed = false;
    Catbus.queueFrame = [];
    Catbus.defaultScope = new Scope('ROOT');

    Catbus.createScope = function(name){
        return Catbus.defaultScope.createChild(name);
    };

    Catbus.queue = function(sensor) {

        var arr = this._queueFrame;
        arr.push(sensor);

        if (this._primed) return;
        this._primed = true;

        if(typeof window !== 'undefined' && window.requestAnimationFrame) requestAnimationFrame(this.flush.bind(this));
        else process.nextTick(this.flush.bind(this));

    };


    Catbus.flush = function(){

        this._primed = false;

        var passes = 0;

        while(this._queueFrame.length > 0) {

            passes++;
            var arr = this._queueFrame;
            this._queueFrame = [];

            while(arr.length){
                var sensor = arr.shift();
                sensor.send();
            }

        }

    };


    var TELL_METHOD = 'tellMethod';


    var TELL_HOLD = 'tellHold';
    var TELL_GROUP = 'tellGroup';
    var TELL_DELAY = 'tellDelay';
    var TELL_PASS = 'tellPass';
    var TELL_FILTER = 'tellFilter';

    var TRANSFORM_METHOD = 'transformMethod';
    var TOPIC_METHOD = 'topicMethod';
    var SOURCE_METHOD = 'sourceMethod';
    var DELAY_METHOD = 'delayMethod';
    var FILTER_METHOD = 'filterMethod';
    var GROUP_METHOD = 'groupMethod';
    var KEEP_METHOD = 'keepMethod';
    var KEEP_COUNT = 'keepCount';
    var TIMER_METHOD = 'timerMethod';
    var CALLBACK_METHOD = 'callbackMethod';
    var MESSAGES_BY_KEY = 'messagesByKey';
    var MESSAGES = 'messages';

    var batchQueue = []; // for all batching

    var processBatchQueue = function(){

        var cycles = 0;

        var q = batchQueue;
        batchQueue = [];

        while(q.length) {

            while (q.length) {
                var stream = q.shift();
                stream.fireContent();
            }

            q = batchQueue;
            batchQueue = [];

            cycles++;
            if(cycles > 10)
                throw new Error('Batch cycling loop > 10.', q);

        }

    };


    var BATCH_TIMER =  function(stream){
        batchQueue.push(stream || this);
    };

    var DEFER_TIMER = function(){
        setTimeout(this.fireContent, 0);
    };

    var SKIP_DUPES_FILTER = function(msg, topic, source, last){
        return msg !== (last && last.msg);
    };

    var CLEAR_ALL = function(){
        if(this.groupMethod)
            this.messagesByKey = {};
        else
            this.messages = [];
    };

    var CLEAR_GROUP = function(){
        var messagesByKey = this.messagesByKey;
        for(var k in messagesByKey){
            messagesByKey[k] = [];
        }
    };

    var TRUE_FUNC = function(){ return true;};
    var FALSE_FUNC = function(){ return false;};
    var TO_SOURCE_FUNC = function(msg, topic, source){ return source;};
    var TO_MSG_FUNC = function(msg, topic, source){ return msg;};
    var TO_TOPIC_FUNC = function(msg, topic, source){ return topic;};

    var KEEP_LAST = function(messages, n){
        if(n)
            return messages.splice(-n);
        return messages[messages.length - 1]
    };
    var KEEP_FIRST = function(messages, n){
        if(n)
            return messages.splice(0, n);
        return messages[0]
    };

    var KEEP_ALL = function(messages){ return messages; };



    var Frame = function(prevFrame){

        this.sensor = null;
        this.prevFrame = prevFrame || null;
        this.nextFrame = null;
        this.streams = [];
        this.keepSpecified = false;
        this.groupSpecified = false;
        this.timerSpecified = false;
        this.nothingSpecified = true;

    };

    // to begin changing the behavior of an existing frame without frame methods adding new frames

    Frame.prototype.fix = function(){

        this.keepSpecified = false;
        this.groupSpecified = false;
        this.timerSpecified = false;
        this.nothingSpecified = true;

    };

    Frame.prototype.transform = function(method){

        if(arguments.length === 0)
            throw new Error('Sensor.frame.transform requires one argument.');

        method = createFunctor(method);

        var frame = this.addFrame();
        frame.modifyFrame(TRANSFORM_METHOD, method);
        return frame;

    };


    Frame.prototype.topic = function(method){

        if(arguments.length === 0)
            throw new Error('Sensor.frame.topic requires one argument.');

        method = createFunctor(method);

        var frame = this.addFrame();
        frame.modifyFrame(TOPIC_METHOD, method);
        return frame;

    };

    Frame.prototype.toTopic = function(){

        var frame = this.addFrame();
        frame.modifyFrame(TOPIC_METHOD, TO_TOPIC_FUNC);
        return frame;

    };

    Frame.prototype.source = function(method){

        if(arguments.length === 0)
            throw new Error('Sensor.frame.source requires one argument.');

        method = createFunctor(method);

        return this.addFrame(SOURCE_METHOD, method);

    };

    Frame.prototype.delay = function(method){

        if(arguments.length === 0)
            throw new Error('Sensor.frame.delay requires one argument.');

        var frame = this.timerSpecified || this.nothingSpecified ? this.addFrame() : this;
        frame.timerSpecified = true;
        frame.nothingSpecified = false;

        method = createFunctor(method);

        frame.modifyFrame(DELAY_METHOD, method);
        frame.modifyFrame(TELL_METHOD, TELL_DELAY);
        return frame;

    };

    Frame.prototype.throttle = function(options){

        if(arguments.length === 0)
            throw new Error('Sensor.frame.delay requires an options argument.');

        var frame = this.timerSpecified || this.nothingSpecified ? this.addFrame() : this;
        frame.timerSpecified = true;
        frame.nothingSpecified = false;

        frame.modifyFrame(DELAY_METHOD, method);
        frame.modifyFrame(TELL_METHOD, TELL_DELAY);
        return frame;

    };

    Frame.prototype.filter = function(method){

        if(arguments.length === 0 || typeof method !== 'function')
            throw new Error('Sensor.frame.filter requires one function argument.');

        var frame = this.addFrame();
        frame.modifyFrame(FILTER_METHOD, method);
        frame.modifyFrame(TELL_METHOD, TELL_FILTER);

        return frame;
    };

    Frame.prototype.skipDupes = function(){

        return this.addFrame(FILTER_METHOD, SKIP_DUPES_FILTER);

    };

    Frame.prototype.group = function(method){

        method = arguments.length === 1 ? createFunctor(method) : TO_SOURCE_FUNC;

        var frame = this.groupSpecified || this.nothingSpecified ? this.addFrame() : this;
        frame.groupSpecified = true;
        frame.nothingSpecified = false;

        frame.modifyFrame(TELL_METHOD, TELL_GROUP);
        frame.modifyFrame(GROUP_METHOD, method);
        frame.modifyFrame(KEEP_METHOD, KEEP_LAST);
        frame.modifyFrame(MESSAGES_BY_KEY, {});

        return frame;

    };


    Frame.prototype.last = function(n){

        var frame = this.keepSpecified || this.nothingSpecified ? this.addFrame() : this;
        frame.keepSpecified = true;
        frame.nothingSpecified = false;

        n = Number(n) || 0;
        frame.modifyFrame(KEEP_METHOD, KEEP_LAST);
        frame.modifyFrame(KEEP_COUNT, n);
        frame.modifyFrame(TELL_METHOD, TELL_HOLD);

        return frame;

    };

    Frame.prototype.first = function(n){

        var frame = this.keepSpecified || this.nothingSpecified ? this.addFrame() : this;
        frame.keepSpecified = true;
        frame.nothingSpecified = false;

        n = Number(n) || 0;
        frame.modifyFrame(KEEP_METHOD, KEEP_FIRST);
        frame.modifyFrame(KEEP_COUNT, n);

        return frame;

    };


    Frame.prototype.all = function(){

        var frame = this.keepSpecified || this.nothingSpecified ? this.addFrame() : this;
        frame.keepSpecified = true;
        frame.nothingSpecified = false;

        frame.modifyFrame(KEEP_METHOD, KEEP_ALL);

        return frame;

    };

    Frame.prototype.batch = function(){

        var frame = this.timerSpecified || this.nothingSpecified ? this.addFrame() : this;
        frame.timerSpecified = true;
        frame.nothingSpecified = false;

        frame.modifyFrame(TIMER_METHOD, BATCH_TIMER);

        return frame;

    };

    Frame.prototype.ready = function(method){

        if(arguments.length === 0 || typeof method !== 'function')
            throw new Error('Sensor.frame.ready requires one function argument.');

        if(!this.scheduleMethod)
            throw new Error('Sensor.frame.ready requires a schedule (batch, defer, throttle, delay)');

        return this.modifyFrame(READY_METHOD, method);

    };


    // create a new frame with matching empty streams fed by the current frame

    Frame.prototype.addFrame = function(){

        var nextFrame = this.nextFrame = new Frame(this);
        var streams = this.streams;
        var len = streams.length;
        var destStreams = nextFrame.streams;

        for(var i = 0; i < len; i++){

            var stream = streams[i];
            var destStream = new Stream();
            destStreams.push(destStream);
            stream.flowsto(destStream);

        }

        return nextFrame;

    };

    Frame.prototype.modifyFrame = function(prop, val){


        var streams = this.streams;
        var len = streams.length;

        for(var i = 0; i < len; i++){

            var stream = streams[i];
            stream[prop] = val;

        }

        return this;

    };


    // create a new frame with one stream fed by all streams of the current frame

    Frame.prototype.mergeFrame = function(){

        var nextFrame = this.nextFrame = new Frame(this);
        var streams = this.streams;
        var destStream = new Stream();
        nextFrame.streams = [destStream];

        for(var i = 0; i < streams; i++){

            var origStream = streams[i];
            origStream.flowsto(destStream);

        }

        return nextFrame;

    };

    function Stream(){

        this.dead = false;
        this.children = []; // streams listening or subscribed to this one
        this.lastPacket = null;
        this.name = null;
        this.topic = null;

        this.messages = null; // [] with hold
        this.messagesByKey = null; // {} with group

        this.tellMethod = TELL_PASS; // default
        this.keepMethod = KEEP_LAST; // default if holding or grouping
        this.keepCount = 0; // non-zero creates an array
        this.groupMethod = null;
        this.transformMethod = null;
        this.filterMethod = null;
        this.topicMethod = null;
        this.sourceMethod = null;
        this.delayMethod = null;

        this.readyMethod = null;
        this.clearMethod = null; // return true/false for latched
        this.latched = false; // from this.clearMethod()
        this.timerMethod = null; // throttle, debounce, defer, batch

        this.primed = false;

    }

    Stream.prototype.flowsto = function(stream){
        this.children.push(stream);
    };

    Stream.prototype.drop = function(stream){

        var i = this.children.indexOf(stream);

        if(i !== -1)
            this.children.splice(i, 1);

    };


    Stream.prototype.tell = function(msg, topic, source) {

        if(this.dead) // true if canceled or disposed midstream
            return this;

        console.log('stream gets:', msg);
        topic = topic || 'update';
        var last = this.lastPacket;

        // tell method = tellDelay, tellGroup, tellHold, tellTransform, tellFilter
        var tellMethod = this[this.tellMethod];
        tellMethod.call(this, msg, topic, source, last);

        return this;

    };


    Stream.prototype.tellNext = function(msg, topic, source, thisStream){

        thisStream = thisStream || this; // allow callbacks with context instead of bind (massively faster)
        thisStream.lastPacket = new Packet(msg, topic, source);

        var children = thisStream.children;
        var len = children.length;

        for(var i = 0; i < len; i++){
            var c = children[i];
            c.tell(msg, topic, source);
        }

    };

    Stream.prototype.tellFilter = function(msg, topic, source) {

        if(this.filterMethod && !this.filterMethod(msg, topic, source, this.lastPacket))
            return;

        this.tellNext(msg, topic, source);

    };



    Stream.prototype.tellDelay = function(msg, topic, source) {

        // passes nextStream as 'this' to avoid bind slowdown

        setTimeout(this.tellNext, this.delayMethod() || 0, msg, topic, source, this);

    };

    Stream.prototype.tellBatch = function(msg, topic, source) {

        // passes nextStream as 'this' to avoid bind slowdown
        setTimeout(this.tell, this.delayMethod() || 0, msg, topic, source, this.nextStream);

    };

    Stream.prototype.tellThrottle = function(msg, topic, source) {

        var nextStream = this.nextStream;
        setTimeout(nextStream.tell.bind(nextStream), this.delayMethod() || 0, msg, topic, source);

    };

    Stream.prototype.tellDebounce = function(msg, topic, source) {

        var nextStream = this.nextStream;
        setTimeout(nextStream.tell.bind(nextStream), this.delayMethod() || 0, msg, topic, source);

    };

    Stream.prototype.tellDebounce = function(msg, topic, source) {

        var nextStream = this.nextStream;
        setTimeout(nextStream.tell.bind(nextStream), this.delayMethod() || 0, msg, topic, source);

    };


    Stream.prototype.tellPass = function(msg, topic, source, last) {

        msg = this.transformMethod ? this.transformMethod(msg, topic, source, last) : msg;
        topic = this.topicMethod ? this.topicMethod(msg, topic, source, last) : topic;
        source = this.sourceMethod ? this.sourceMethod(msg, topic, source, last) : source;

        this.tellNext(msg, topic, source);

    };


    Stream.prototype.tellGroup = function(msg, topic, source, last) {

        var groupName = this.groupMethod(msg, topic, source, last);

        var messages = this.messagesByKey[groupName] = this.messagesByKey[groupName] || [];
        messages.push(msg);

        if(!this.primed && (this.latched || this.readyMethod(this.messagesByKey, last))) {
            if(this.timerMethod) {
                this.primed = true;
                this.timerMethod(); // should call back this.fireContent
            } else {
                this.fireContent();
            }
        }

    };

    Stream.prototype.tellHold = function(msg, topic, source, last) {

        var messages = this.messages = this.messages || [];
        messages.push(msg);

        if(!this.primed && (this.latched || this.readyMethod(this.messages, last))) {
            if(this.timerMethod) {
                this.primed = true;
                this.timerMethod(); // should call back this.fireContent
            } else {
                this.fireContent();
            }
        }

    };

    Stream.prototype.fireContent = function() {

        var msg = this.groupMethod ? this.resolveGroupContent() : this.resolveHoldContent();

        this.latched = this.clearMethod(); // might be noop, might hold latch
        this.primed = false;

        this.tellNext(msg);

    };

    Stream.prototype.resolveGroupContent = function(){

        var messagesByKey = this.messagesByKey;
        for(var k in messagesByKey){
            messagesByKey[k] = this.keepMethod(messagesByKey[k], this.keepCount);
        }
        return messagesByKey;

    };

    Stream.prototype.resolveHoldContent = function(){

        return this.messages = this.keepMethod(this.messages, this.keepCount);

    };


    var Packet = function(msg, topic, source){

        this.msg = msg;
        this.topic = topic || 'update';
        this.source = source;
        this.timestamp = Date.now();

    };

    
    function Scope(name) {

        this.id = ++Catbus.uid;
        this.name = name;
        this.parent = null;
        this.children = [];
        this.dimensions = {data: {}}; // by dimension then data name
        this.valves = {}; // by dimension then data name
        this.sensors = []; // by id
        this.dead = false;

    }

    // create a sensor watching one or more data elements
    Scope.prototype.watch = function(name, topic, dimension){

        var topic = topic || 'update';
        var nameList = (typeof name === 'string') ? [name] : name;
        var len = nameList.length;


        var frame = new Frame();
        var streams = frame.streams;

        for(var i = 0; i < len; i++){
            var d = this.findData(name, dimension);
            var s = new Stream();
            d.flowsto(s, topic);
            streams.push(s);
        }

        var sensor = new Sensor(this);
        sensor.frames = [new Frame()]

    };

    Scope.prototype.destroy = function(){

        var i, j, key, len;

        if(this._dropped) return;

        var children = this.children;
        var sensors = this.sensors;
        var dimensions = this.dimensions;

        len = children.length;

        for(i = 0; i < len; i++){
            var child = children[i];
            child.destroy(null);
        }

        len = sensors.length;
        for(i = 0; i < len; i++){
            var sensor = sensors[i];
            sensor.destroy();
        }

        var dimensionKeys = Object.keys(dimensions);
        for(i = 0; i < dimensionKeys.length; i++){
            key = dimensionKeys[i];
            var dataByName = dimensions[key];
            var dataKeys = Object.keys(dataByName);
            for(j = 0; j < dataKeys.length; j++){
                var dataName = dataKeys[j];
                dataByName[dataName].destroy();
            }
        }


        this.dimensions = null;
        this.sensors = null;
        this.children = null;
        this.valves = null;
        this.parent = null;
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
            data.scope = this;

        }

        return data;

    };

    Scope.prototype.findData = function(name, dimension){

        var localData = this.getData(name, dimension);
        if(localData)
            return localData;

        var parent = this.parent;

        while(parent){
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


    Scope.prototype._getData = function(name) {
        return this._datas[name] || null;
    };


    Scope.prototype.valves = function(valves){

        var hash = null;

        if(valves && valves.length > 0){
            hash = {};
            for(var i = 0; i < valves.length; i++){
                var name = valves[i];
                hash[name] = true;
            }
        }

        this._valves = hash;
        return this;

    };


    // holds subscriptions for a topic on a data element
    var DataFlow = function(topic, data) {

        this.topic = topic;
        this.streams = [];
        this.lastPacket = null;
        this.data = data;
        this.ephemeral = data.ephemeral;
        this.name = data.name;
        this.dead = false;

    };


    DataFlow.prototype.tell = function(msg){

        if(this.dead) return;

        var topic = this.topic;
        var source = this.name;
        var last = this.lastPacket;

        if(!this.ephemeral)
            this.lastPacket = new Packet(msg, topic, source);

        var streams = [].concat(this.streams); // call original sensors in case subscriptions change mid loop
        var len = streams.length;

        for(var i = 0; i < len; i++){
            var s = streams[i];
            s.tell(msg, topic, source, last);
        }

    };

    DataFlow.prototype.destroy = function(){

        if(this.dead) return;

        var streams = this.streams;
        var len = streams.length;

        for(var i = 0; i < len; i++){
            var s = streams[i];
            s.destroy();
        }

        this.streams = null;
        this.lastPacket = null;
        this.dead = true;

    };

    DataFlow.prototype.flowsto = function(stream){
        this.streams.push(stream);
    };

    DataFlow.prototype.drop = function(stream){

        var i = this.streams.indexOf(stream);

        if(i !== -1)
            this.streams.splice(i, 1);

    };



    var Host = function(name){
        this._name = name;
        this._sensorMap = {};
    };


    var Sensor = function(scope) {

        this.scope = scope;
        this.frames = [];
        this.dead = false;

    };



    Sensor.prototype.destroy = function(){

        if(this.dead)
            return this;

        this.dead = true;
        this.scope = null;

        var frames = this.frames;
        var len = frames.length;

        for(var i = 0; i < len; i++){
            var f = frames[i];
            f.destroy();
        }

        return this;

    };


    var Data = function(scope, name, dimension, ephemeral) {

        this.dimension = dimension || 'data';
        this.ephemeral = !!ephemeral;
        this.name = name;
        this.scope = scope;

        this.subscriptionsByTopic = {}; 

        this.demandDataFlow('*'); // wildcard storage data for all topics
        this.demandDataFlow('update'); // default for data storage

        this.dead = false;

    };


    Data.prototype.destroy = function(){

        if(this.dead)
            return;

        for(var topic in this.subscriptionsByTopic){
            var subs = this.subscriptionsByTopic[topic];
            subs.destroy();
        }

        this.dead = true;

    };


    Data.prototype.demandDataFlow = function(topic){

        var list = this.subscriptionsByTopic[topic];

        if(list)
            return list;

        return this.subscriptionsByTopic[topic] = new DataFlow(topic, this);

    };

    Data.prototype.flowsto = function(stream, topic){

        var pub = this.demandDataFlow(topic);
        pub.flowsto(stream)

    };


    Data.prototype.peek = function(topic){

        topic = topic || 'update';
        var dataFlow = this.subscriptionsByTopic[topic];
        if(!dataFlow)
            return undefined;
        return dataFlow.lastPacket;

    };

    // todo split internal data write vs public external to monitor 'fire' -- also add auto/fire check
    Data.prototype.read = function(topic) {
        topic = topic || 'update';
        var packet = this.peek(topic);
        return (packet) ? packet.msg : undefined;
    };


    Data.prototype.write = function(msg, topic){

        topic = topic || 'update';

        this.demandDataFlow(topic);

        for(var t in this.subscriptionsByTopic){
            if(t === "*" || t === topic){
                var dataFlow = this.subscriptionsByTopic[t];
                dataFlow.tell(msg);
            }
        }
    };

    Data.prototype.refresh = function(topic){
        this.write(this.read(topic),topic);
    };

    Data.prototype.toggle = function(topic){
        this.write(!this.read(topic),topic);
    };

    var plugins = typeof seele !== 'undefined' && seele;
    if(plugins)
        plugins.register('catbus', Catbus, true);
    else
        externalContext.Catbus = Catbus;
    
    if ((typeof define !== "undefined" && define !== null) && (define.amd != null)) {
        define([], function() {
            return catbus;
        });
        this.Catbus = Catbus;
    } else if ((typeof module !== "undefined" && module !== null) && (module.exports != null)) {
        module.exports = Catbus;
    } else {
        this.Lain = Catbus;
    }




}).call(this);
