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



    describe('Data', function(){

        before(function(){

            resetLog();
            root.clear();
            world = root.createChild('world');

        });

        it('can create named data', function(){

            var d = world.demandData('ergo');
            var name = d.name();
            assert.equal('ergo', name);

        });

        it('can write data', function(){

            var d = world.demandData('ergo');
            d.write('proxy');
            var value = d.read();

            assert.equal('proxy', value);

        });

        it('can modify data', function(){

            var d = world.demandData('ergo');
            d.write('autoreiv');
            var value = d.read();

            assert.equal('autoreiv', value);

        });



        it('can toggle data', function(){

            var d = world.demandData('ergo');
            d.toggle();
            assert.equal(false, d.read());
            d.toggle();
            assert.equal(true, d.read());
            d.toggle();
            assert.equal(false, d.read());

        });


        it('can subscribe to data', function(){

            resetLog();
            var d = world.demandData('ergo');
            d.subscribe(callback);
            d.write('Re-L');
            var value = msgLog[0];
            assert.equal('Re-L', value);

        });


        it('can refresh existing data', function(){

            resetLog();
            var d = world.demandData('ergo');
            d.refresh();
            var value = msgLog[0];
            assert.equal('Re-L', value);

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

            console.log(msgLog[0]);
            console.log(msgLog[1]);

            var value = msgLog[0];
            assert.equal(value, 'Romdeau');
            assert.equal(msgLog.length, 1);

        });



    });

    describe('Scopes', function(){



        it('finds data up the tree', function(){

            var fruitTree = root.createChild('fruit');
            fruitTree.demandData('owner').write('Scott');

            var sour = fruitTree.createChild('sour');
            var sweet = fruitTree.createChild('sweet');
            var tart = fruitTree.createChild('tart');

            var mango = sweet.createChild('mango');
            mango.demandData('owner').write('Landon');

            var ownerData = sour.findData('owner');
            var owner = ownerData.read(); // owner at fruit level
            assert.equal(owner, 'Scott');

            sweet.demandData('owner').write('Lars');
            sour.demandData('owner').write('Nick');

            owner = sweet.findData('owner').read();
            assert.equal(owner, 'Lars');

            owner = sour.findData('owner').read();
            assert.equal(owner, 'Nick');

            owner = tart.findData('owner').read();
            assert.equal(owner, 'Scott');

            owner = mango.findData('owner').read();
            assert.equal(owner, 'Landon');


        });


    });






});


