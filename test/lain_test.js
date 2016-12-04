//run mocha from project root


var assert = require('assert');
var Lain = require('../src/lain.js');

var _invoked = 0;
var _msg;
var _topic;
var _tag;
var _context;

var _logger = function(msg, topic, tag){

    console.log("LOG: ",msg,  " : " + topic + " : " + tag + "\n");

};

var _callback = function(msg, topic, tag){

    _context = this;
    _msg = msg;
    _topic = topic;
    _tag = tag;
    _invoked++;

};

var _script = {
    mehve: 1,
    ohmu: 999
};




var tree, boat, castle, valley, airship, girl, ohmu, yupa, lands;

var _reset = function(){

    _context = undefined;
    _msg = undefined;
    _topic = undefined;
    _tag = undefined;
    _invoked = 0;

   // if(girl) { girl.drop(); girl = null;}

};

var root = new Lain().createChild();

castle = root.demandData('castle');
valley  = root.demandData('valley');
airship  = root.demandData('airship');



describe('Lain', function(){

    before(function(){
        tree = root.demandData('tree');
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

    describe('Datas', function(){


        it('can hold data', function(){
            tree.write('Totoro');
            assert.equal('Totoro', tree.read());
        });

        it('can modify data', function(){
            tree.write('Kittenbus');
            assert.equal('Kittenbus', tree.read());
            tree.write('Catbus');
            assert.equal('Catbus', tree.read());
        });



        it('can toggle data', function(){
            tree.write('Mei');
            tree.toggle();
            assert.equal(false, tree.read());
            tree.toggle();
            assert.equal(true, tree.read());
            tree.toggle();
            assert.equal(false, tree.read());
        });


        it('can refresh data without changing', function(){
            tree.write('Catbus');
            tree.refresh();
            assert.equal('Catbus', tree.read());
        });



    });




});


