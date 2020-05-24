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

module.VERBOSE = false



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


var assert = function(pre, stats){
	return function(e, msg, ...args){
		stats
			&& (stats.assertions += 1)
			&& !e
				&& (stats.failures += 1)
		module.VERBOSE
			&& console.log(pre +': '+ msg, ...args)
		console.assert(e, pre +': '+ msg, ...args)
		return e } }


//---------------------------------------------------------------------

var setups = {
	basic: function(assert){
		var X, Y, A, B, C
		return {
			X: X = assert(object.Constructor('A'), `Constructor`),
			Y: Y = assert(object.C('Y', { }), ` C`),

			A: A = assert(object.C('A', Y, { }), `inherit (gen1)`),
			B: B = assert(object.C('B', A, { }), `inherit (gen2)`),
			C: C = assert(object.C('C', B, { }), `inherit (gen3)`),
		} },
	init: function(assert){
		return {

		} },
	call: function(assert){
		var A, B, C, D, F, G
		return {
			A: A = assert(object.C('A', 
				function(){
					return 'A'
				}), 'callable'),
			B: B = assert(object.C('B', {
				__call__: function(){
					return 'B'
				},
			}), 'callable'),

			C: C = assert(object.C('C', A, {}), 'basic inherit'),
			D: D = assert(object.C('D', B, {}), 'basic inherit'),

			E: E = assert(object.C('E', A,
				function(){
					assert(
						object.parentCall(E.prototype, '__call__', this, ...arguments) == 'A', 
						'parrent call')
					return 'E'
				}), 'call parent'),
			F: F = assert(object.C('F', B, {
				__call__: function(){
					assert(
						object.parentCall(F.prototype, '__call__', this, ...arguments) == 'B', 
						'parent call')
					return 'F'
				},
			}), 'call parent\'s .__call__'),

			// XXX not sure about these...
			a: A(),
			b: B(),
			e: E(),
			f: F(),
		} },
	native: function(assert){
		return {

		} },
	mixin: function(assert){
		return {

		} },
	instances: function(assert){
		// XXX generate using tests.instance*
		// XXX need to be able to use different input setups...
		return {}
	},
}

var modifiers = {
	// default...
	'as-is': function(assert, setup){
		return setup }

	// XXX
}



var tests = {
	instance: function(assert, setup, mode){
		return constructors(setup) 
			.reduce(function(res, [k, O]){
				var o = res[k.toLowerCase()] = 
					mode == 'no_new' ?
						assert(O(), `new:`, k)
					: mode == 'raw' ?
						assert(O.__rawinstance__(), `.__rawinstance__()`, k)	
					: assert(new O(), `new:`, k)
				assert(o instanceof O, `instanceof:`, k)
				O.__proto__ instanceof Function
					&& assert(o instanceof O.__proto__, `instanceof-nested:`, k)
				assert(o.constructor === O, `.constructor:`, k)
				assert(o.__proto__ === O.prototype, `.__proto__:`, k)
				return res }, {}) },
	instance_no_new: function(assert, setup){
		return this.instance(assert, setup, 'no_new') },
	instance_raw: function(assert, setup){
		return this.instance(assert, setup, 'raw') },

	attributes: function(assert, setup){
		return {}
	},

	// XXX
	methods: function(assert, setup){
		constructors(setup)
			.forEach(function([k, O]){
				Object.keys(O).forEach(function(m){
					typeof(O[m]) == 'function'
						&& O[m]() })
			})
		return {}
	},
	callables: function(assert, setup){
		return instances(setup)
			.map(function([k, o]){
				return typeof(o) == 'function'
					&& assert(o(), 'call', k) }) },
}


// specific independent cases...
// XXX not sure about these...
var cases = {
}



//---------------------------------------------------------------------

// XXX need to have two modes:
// 		- clean
// 		- reuse test results again...
var runner = function(){
	var stats = {
		tests: 0,
		assertions: 0,
		failures: 0,
	}

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
							stats.tests += 1
							var _assert = assert(`test:${t}.${s}.${m}`, stats)
							tests[t](_assert, 
								modifiers[m](_assert, 
									setups[s](_assert))) }) }) }) 
	// cases...
	Object.keys(cases)
		.forEach(function(c){
			stats.tests += 1
			cases[c]( assert(`case:${c}:`, stats) ) }) 

	// stats...
	console.log('Tests:', stats.tests, 
		'Assertions:', stats.assertions, 
		'Failures:', stats.failures) }


runner()


/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
