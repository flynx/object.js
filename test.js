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

// NOTE: to test in verbose mode do:
// 			$ export VERBOSE=1 && npm test
// 		or
// 			$ export VERBOSE=1 && node test.js
// 		or set this manually after require('./test') but before running 
// 		the runner(..)
// 		XXX this may change in the future...
module.VERBOSE = process ?
	process.env.VERBOSE
	: false



//---------------------------------------------------------------------
// helpers...

var deepKeys = function(obj, stop){
	var res = []
	while(obj !== stop && obj != null){
		res.push(Object.keys(obj))
		obj = obj.__proto__ }
	return [...(new Set(res.flat()))] }

// a constructor is a thing that starts with a capital and has a .prototype
var constructors = function(obj){
	return Object.entries(obj)
		.filter(function([k, o]){
			return k[0] == k[0].toUpperCase() 
				&& o.prototype }) }

// an instance is a thing that starts with a lowercase and has a .constructor
var instances = function(obj){
	return Object.entries(obj)
		.filter(function([k, o]){
			return k[0] == k[0].toLowerCase() 
				&& o.constructor }) }


var makeAssert = function(pre, stats){
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
	// basic constructor and inheritance...
	basic: function(assert){
		var X, Y, A, B, C
		return {
			X: X = assert(object.Constructor('A'), `Constructor`),
			Y: Y = assert(object.C('Y', { }), ` C`),

			A: A = assert(object.C('A', Y, { }), `inherit (gen1)`),
			B: B = assert(object.C('B', A, { }), `inherit (gen2)`),
			C: C = assert(object.C('C', B, { }), `inherit (gen3)`),
		} },

	// initialization...
	init: function(assert){
		var A, B, C
		return {
			// init...
			A: A = assert(object.C('A', {
				msg: '.__init__()',
				__init__: function(){
					this.init_has_run = true },
				test_init: function(){
					this.__created_raw ?
						assert(!this.init_has_run, this.msg+' did not run')
						: assert(this.init_has_run, this.msg+' run') },
			}), 'basic .__init__(..)'),
			// new...
			B: B = assert(object.C('B', {
				__new__: function(){
					var o = {}
					o.new_has_run = true
					return o
				},
				test_new: function(){
					assert(this.new_has_run, '.__new__() run') },
			}), 'basic .__new__(..)'),
			// new + init...
			C: C = assert(object.C('C', B, { 
				msg: '.__init__() after .__new__()',
				__init__: function(){
					this.init_has_run = true },
				test_init: A.prototype.test_init,
			}), `inherit .__new__()`),

			// XXX gen2 and extended stuff???
			// XXX
		} },

	// callable instances...
	call: function(assert){
		// constructors...
		var A, B, C, D, F, G
		var res = {
			A: A = assert(object.C('A', 
				function(){
					return 'A'
				}), 'callable'),
			B: B = assert(object.C('B', {
				__non_function: true,
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
		} 
		// create instances...
		var objs = tests.instance(assert, res)
		// all instances must be callable...
		// NOTE: not all instances are going to be instanceof Function...
		Object.entries(objs)
			.forEach(function([k, o]){
				assert(typeof(o) == 'function', 'instance is callable', k) })
		return Object.assign(res, objs) },

	// inherit from native constructors...
	native: function(assert){
		return [
			Object,
			Array,
			Number,
			Map,
			Set,
		].reduce(function(res, type){
			var n = type.name
			// direct inherit...
			var O = res[n] = 
				assert(object.C(n, type, {}), 'inherit from '+n)
			return res
		}, {}) },

	/*/ XXX mixins...
	mixin: function(assert){
		return {

		} },
	//*/
}

var modifiers = {
	// default...
	'as-is': function(assert, setup){
		return setup },

	// make gen2-3 constructors...
	//
	// NOTE: there is almost no need to test below gen3...
	gen2: function(assert, setup, gen){
		gen = gen || 2
		return constructors(setup)
			.reduce(function(res, [n, O]){
				res[n+'g'+gen] = object.C(n+'g'+gen, O, {})
				return res }, {}) },
	gen3: function(assert, setup){
		return this.gen2(assert, this.gen2(assert, setup), '3') },

	// generate instances...
	// NOTE: these are re-used as tests too...
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
	// NOTE: here we mark the raw instances with .__created_raw
	instance_raw: function(assert, setup){
		var res = this.instance(assert, setup, 'raw') 
		Object.values(res)
			.forEach(function(e){
				Object.assign(
					e, 
					{__created_raw: true}) })
		return res },
}



var tests = {
	// instance creation...
	instance: modifiers.instance,
	instance_no_new: modifiers.instance_no_new,
	instance_raw: modifiers.instance_raw,

	/*/ XXX
	attributes: function(assert, setup){
		return {} },
	//*/

	methods: function(assert, setup){
		instances(setup)
			.forEach(function([k, o]){
				deepKeys(o)
					.forEach(function(m){
						typeof(o[m]) == 'function'
							// skip special methods...
							&& !m.startsWith('__')
							&& o[m]() }) })
		return {} },
	constructor_methods: function(assert, setup){
		constructors(setup)
			.forEach(function([k, O]){
				deepKeys(O)
					.forEach(function(m){
						typeof(O[m]) == 'function'
							// skip special methods...
							&& !m.startsWith('__')
							&& O[m]() }) })
		return {} },
	callables: function(assert, setup){
		return instances(setup)
			.map(function([k, o]){
				// NOTE: not all callables are instances of Function...
				typeof(o) == 'function' 
					&& (o.__non_function ?
						assert(!(o instanceof Function), 'non-instanceof Function', k)
						: assert(o instanceof Function, 'instanceof Function', k))
				return typeof(o) == 'function'
					&& assert(o(), 'call', k) }) },
}


// specific independent cases...
//
// NOTE: it is a good idea to migrate tests from here into the main 
// 		framework so as to be able to use them on more setups...
var cases = {
	'example': function(assert){
		assert(true, 'example.')
	},
}



//---------------------------------------------------------------------

// Test runner...
//
// This will run 
// 		test(modifier(setup)) 
// 			for each test in tests
// 			for each modifier in modifiers
// 			for each setup in setups
// 		case() 
// 			for each case in cases
//
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
							if(typeof(setups[s]) != 'function'){
								return }
							// run the test...
							stats.tests += 1
							var _assert = makeAssert(`test:${t}.${s}.${m}`, stats)
							tests[t](_assert, 
								modifiers[m](_assert, 
									setups[s](_assert))) }) }) }) 
	// cases...
	Object.keys(cases)
		.forEach(function(c){
			stats.tests += 1
			cases[c]( makeAssert(`case:${c}:`, stats) ) }) 
	// stats...
	console.log('Tests run:', stats.tests, 
		'Assertions:', stats.assertions, 
		'Failures:', stats.failures) 
	return stats }



//---------------------------------------------------------------------

var stats = runner()


// report error status to the OS...
process
	&& process.exit(stats.failures)




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
