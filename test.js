/**********************************************************************
* 
*
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var object = require('./object')



//---------------------------------------------------------------------
// helpers...

var constructors = function(obj){
	return Object.entries(obj)
		.filter(function([k, o]){
			return k[0] == k[0].toUpperCase() && o.prototype }) }


var instances = function(obj){
	return Object.entries(obj)
		.filter(function([k, o]){
			return k[0] == k[0].toLowerCase() && o.constructor }) }



//---------------------------------------------------------------------

var setups = {
	basic: function(msg){
		var X, Y, A, B, C
		return {
			X: X = object.Constructor('A'),
			Y: Y = object.C('Y', { }),

			A: A = object.C('A', Y, { }),
			B: B = object.C('B', A, { }),
			C: C = object.C('C', B, { }),
		} },
	init: function(msg){
		return {

		} },
	call: function(msg){
		return {

		} },
	native: function(msg){
		return {

		} },
	instances: function(msg){
		// XXX generate using tests.instance*
		return {}
	},
}

var modifiers = {
	'as-is': function(msg, setup){
		return setup }
}



var tests = {
	instance: function(msg, setup, no_new){
		return constructors(setup) 
			.reduce(function(res, [k, O]){
				var o
				no_new ?
					console.assert(o = res[k.toLowerCase()] = O(), `${msg}: new:`, k)
					: console.assert(o = res[k.toLowerCase()] = new O(), `${msg}: new:`, k)
				console.assert(o instanceof O, `${msg}: instanceof:`, k)
				console.assert(o.constructor === O, `${msg}: constructor:`, k)
				console.assert(o.__proto__ === O.prototype, `${msg}: __proto__:`, k)
				return res }, {}) },
	instance_no_new: function(msg, setup){
		return this.instance(msg, setup, true) },
}


// specific independent cases...
// XXX not sure about these...
var cases = {
}



// XXX need to report stats...
var runner = function(){
	// tests...
	Object.keys(tests)
		.forEach(function(t){
			// modifiers...
			Object.keys(modifiers)
				.forEach(function(m){
					// setups...
					Object.keys(setups)
						.forEach(function(s){
							// run the test...
							msg =`test:${t}.${s}.${m}`
							tests[t](msg, modifiers[m](msg, setups[s](msg))) }) }) }) 
	// cases...
	Object.keys(cases)
		.forEach(function(c){
			msg = `case:${c}:`
			cases[c](msg)
		})
}


runner()


/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
