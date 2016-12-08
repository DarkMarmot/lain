var Lain = require('../src/lain.js'); // Lain is an instance of Scope

// create a scope hierarchy as in a user-interface

var appScope = Lain.createChild();
var pageScope = appScope.createChild();
var widgetScope = pageScope.createChild();

appScope.data('user').write('Knights of the Eastern Calculus');
appScope.state('url').write('main');

appScope.action('navigate').subscribe(function(msg){
    appScope.state('url').write(msg);
});

widgetScope.find('navigate').write('Cyberia');

pageScope.find('url').follow(function(msg){
    console.log('Paging to: ' + msg);
});


var n = Date.now();

for(var i = 0; i < 1000000; i++){
    var s1 = appScope.createChild();
    var s2 = s1.dimension();
    if(s1 !== s2){
        console.log('argh');
        break;
    }
}

console.log('diff', (Date.now()-n));


var flatScope = widgetScope.flatten();
console.log(Object.keys(flatScope));