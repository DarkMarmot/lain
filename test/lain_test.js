//run mocha from project root

var assert = require('assert');
var Lain = require('../src/lain.js');

var root = new Lain();

var packetLog;
var msgLog;
var contextLog;

function Watcher(name){

    this.name = name;

}

Watcher.prototype.tell = function(msg, packet){

    callback(msg, packet, this);

};

function callback(msg, packet){

    msgLog.push(msg);
    packetLog.push(packet);
    contextLog.push(this);

}

function resetLog(){

    packetLog = [];
    msgLog = [];
    contextLog = [];

}


describe('Lain', function(){

    var world;

        before(function(){

            resetLog();
            root.clear();
            world = root.createChild('world');

        });

        it('can create named data', function(){

            var d = world.demandData('ergo');
            var name = d.name();
            assert.equal(name, 'ergo');

        });

        it('can write data', function(){

            var d = world.demandData('ergo');
            d.write('proxy');
            var value = d.read();

            assert.equal(value, 'proxy');

        });

        it('can modify data', function(){

            var d = world.demandData('ergo');
            d.write('autoreiv');
            var value = d.read();

            assert.equal(value, 'autoreiv');

        });



        it('can toggle data', function(){

            var d = world.demandData('ergo');
            d.toggle();
            assert.equal(d.read(), false);
            d.toggle();
            assert.equal(d.read(), true);
            d.toggle();
            assert.equal(d.read(), false);

        });


        it('can subscribe to data', function(){

            resetLog();
            var d = world.demandData('ergo');
            d.subscribe(callback);
            d.write('Re-L');
            var value = msgLog[0];
            assert.equal(value, 'Re-L');

        });


        it('can refresh existing data', function(){

            resetLog();
            var d = world.demandData('ergo');
            d.refresh();
            var value = msgLog[0];
            assert.equal(value, 'Re-L');

        });

        it('can subscribe to topics', function(){

            resetLog();
            world.clear();
            var d = world.demandData('ergo');
            d.subscribe(callback, 'arcology');
            d.write('Vincent', 'character');
            d.write('Re-L', 'character');
            d.write('Romdeau', 'arcology');
            d.write('wasteland');

            var value = msgLog[0];
            assert.equal(value, 'Romdeau');
            assert.equal(msgLog.length, 1);

        });

        it('can monitor all topics', function(){

            resetLog();
            world.clear();
            var d = world.demandData('ergo');
            d.monitor(callback);
            d.write('Vincent', 'character');
            d.write('Re-L', 'character');
            d.write('Romdeau', 'arcology');
            d.write('wasteland');

            var value = msgLog[2];
            var topic = packetLog[1].topic;
            assert.equal(value, 'Romdeau');
            assert.equal(topic, 'character');
            assert.equal(msgLog.length, 4);

        });

        it('finds data up the tree', function(){



        });


});


