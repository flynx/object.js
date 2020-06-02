/**********************************************************************
* 
* This is an experimental test framework...
*
* The idea is that we can split the tests into:
* 	- setups
* 		Construct as set of testable things.
* 		On this stage the construction process can be tested.
* 	- modifiers
* 		Take a set of testable things as returned by a setup/modifier and
* 		modify them or produce new things based on the old ones.
* 		Here the modification process can be tested.
* 	- tests
* 		Take a set of things as returned by a setup/modifier and run a 
* 		set of tests on them.
* 		This stage tests a specific state and interactions within it.
* 	- specific cases
* 		A specific manual construction of a thing, its modification and
* 		test.
*
* Testing is done by building/running a number chains, starting with a 
* setup, then chaining the results through zero or more modifiers and 
* finally into a test.
*
* The actual testing is dune via assert(..) functions and is not 
* restricted to the test stage.
*
*
* NOTE: tests can be used as modifiers if they modify state and return 
* 		the modified input.
*
*
* XXX thins to simplify:
* 		- would be nice if the actual code could be readable...
* 		- can we automate assert callas?
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
// NOTE: this may change in the future...
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

var setups = 
module.setups = {
	// basic constructor and inheritance...
	basic: function(assert){
		var X, Y, A, B, C
		return {
			X: X = assert(object.Constructor('A'), `Constructor`),
			Y: Y = assert(object.C('Y', { }), `C`),

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

	/*/ XXX methods (instance/constructor)...
	methods: function(assert){
		return {} },
	//*/
	
	/*/ XXX mixins...
	mixin: function(assert){
		return {

		} },
	//*/
}


var modifiers =
module.modifiers = {
	// default...
	//
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
	//
	// NOTE: these are re-used as tests too...
	instance: function(assert, setup, mode){
		return constructors(setup) 
			.reduce(function(res, [k, O]){
				// create instance with lowercase name of constructor...
				// NOTE: constructor is expected to be capitalized...
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
	// NOTE: here we mark the raw instances with .__created_raw, this is
	// 		done to be able to distinguish them from fully initialized 
	// 		instances...
	instance_raw: function(assert, setup){
		var res = this.instance(assert, setup, 'raw') 
		Object.values(res)
			.forEach(function(e){
				Object.assign(
					e, 
					{__created_raw: true}) })
		return res },


	// sanity checks...
	//
	// NOTE: these should have no side-effects but since we can run 
	// 		them why not run them and verify ;)
	get methods(){ return tests.methods },
	get constructor_methods(){ return tests.constructor_methods },
	get callables(){ return tests.callables },
}



var tests =
module.tests = {
	// instance creation...
	instance: modifiers.instance,
	instance_no_new: modifiers.instance_no_new,
	instance_raw: modifiers.instance_raw,

	/*/ XXX
	attributes: function(assert, setup){
		return {} },
	//*/

	// methods...
	methods: function(assert, setup){
		instances(setup)
			.forEach(function([k, o]){
				deepKeys(o)
					.forEach(function(m){
						typeof(o[m]) == 'function'
							// skip special methods...
							&& !m.startsWith('__')
							&& o[m]() }) })
		return setup },
	constructor_methods: function(assert, setup){
		constructors(setup)
			.forEach(function([k, O]){
				deepKeys(O)
					.forEach(function(m){
						typeof(O[m]) == 'function'
							// skip special methods...
							&& !m.startsWith('__')
							&& O[m]() }) })
		return setup },

	// callables...
	callables: function(assert, setup){
		instances(setup)
			.forEach(function([k, o]){
				// NOTE: not all callables are instances of Function...
				typeof(o) == 'function' 
					&& (o.__non_function ?
						assert(!(o instanceof Function), 'non-instanceof Function', k)
						: assert(o instanceof Function, 'instanceof Function', k))
				typeof(o) == 'function'
					&& assert(o(), 'call', k) }) 
		return setup },
}


// specific independent cases...
//
// NOTE: it is a good idea to migrate tests from here into the main 
// 		framework so as to be able to use them on more setups...
var cases =
module.cases = {
	'example': function(assert){
		assert(true, 'example.')
	},
}



//---------------------------------------------------------------------

// Test runner...
//
// 	runner()
// 	runner('*')
// 		-> stats
//
// 	runner('case')
// 	runner('setup:test')
// 	runner('setup:mod:test')
// 		-> stats
//
//
// This will run 
// 		test(modifier(setup)) 
// 			for each test in tests
// 			for each modifier in modifiers
// 			for each setup in setups
// 		case() 
// 			for each case in cases
//
//
// NOTE: chaining more than one modifier is not yet supported (XXX)
var runner = 
module.runner =
function(chain, stats){
	// parse chain...
	chain = (chain == '*' || chain == null) ?
		[]
		: chain
	chain = chain instanceof Array ? 
		chain 
		: chain.split(/:/)
	var chain_length = chain.length
	var setup = chain.shift() || '*'
	var test = chain.pop() || '*'
	var mod = chain.pop() || '*'

	// stats...
	stats = stats || {}
	Object.assign(stats, {
		tests: stats.tests || 0,
		assertions: stats.assertions || 0,
		failures: stats.failures || 0,
		time: stats.time || 0,
	})

	var started = Date.now()
	// tests...
	chain_length != 1
		&& Object.keys(tests)
			.filter(function(t){
				return test == '*' || test == t })
			.forEach(function(t){
				// modifiers...
				Object.keys(modifiers)
					.filter(function(m){
						return mod == '*' || mod == m })
					.forEach(function(m){
						// setups...
						Object.keys(setups)
							.filter(function(s){
								return setup == '*' || setup == s })
							.forEach(function(s){
								if(typeof(setups[s]) != 'function'){
									return }
								// run the test...
								stats.tests += 1
								// XXX revise order...
								var _assert = makeAssert(`test: ${s}:${m}:${t}`, stats)
								tests[t](_assert, 
									modifiers[m](_assert, 
										setups[s](_assert))) }) }) }) 
	// cases...
	chain_length <= 1
		&& Object.keys(cases)
			.filter(function(s){
				return setup == '*' || setup == s })
			.forEach(function(c){
				stats.tests += 1
				cases[c]( makeAssert(`case: ${c}`, stats) ) }) 
	// runtime...
	stats.time += Date.now() - started
	return stats }



//---------------------------------------------------------------------

// we are run from command line -> test...
//
// NOTE: normally this would be require.main === module but we are 
// 		overriding module in the compatibility wrapper so we have to do 
// 		things differently...
//
// XXX update wrapper to make the condition simpler...
if(typeof(__filename) != 'undefined'
		&& __filename == (require.main || {}).filename){

	// parse args...
	var args = process.argv.slice(2)
	var arg
	var chains = []
	while(args.length > 0){
		arg = args.shift()

		// options...
		if(/^--?[a-zA-Z-]*/.test(arg)){
			arg = arg.replace(/^--?/, '')

			// verbose...
			if(arg == 'v' || arg == 'verbose'){
				module.VERBOSE=true

			// help...
			// XXX format the lists better... word-wrap??
			} else if(arg == 'h' || arg == 'help'){
				console.log(object.normalizeTextIndent(
					`Usage: ${ process.argv[1].split(/[\\\/]/).pop() } [OPTIONS] [CHAIN] ...

					Chain format:
						<case>
						<setup>:<test>
						<setup>:<modifier>:<test>

					Each item can either be a specific item name or '*' to indicate any/all 
					items.

					Setups:
						${ Object.keys(setups).join(', ') }

					Modifiers:
						${ Object.keys(modifiers).join(', ') }

					Tests:
						${ Object.keys(tests).join(', ') }

					Options:
						-h | --help			print this message and exit
						-v | --verbose		verbose mode

					`))
				process.exit() } 

			continue }

		// collect chains...
		chains.push(arg) }
		
	// run the tests...
	var stats = {}
	chains.length > 0 ?
		chains
			.forEach(function(chain){
				runner(chain, stats) })
		: runner('*', stats)

	// print stats...
	console.log('Tests run:', stats.tests, 
		'Assertions:', stats.assertions, 
		'Failures:', stats.failures,
		`  (${stats.time}ms)`) 

	// report error status to the OS...
	process.exit(stats.failures)
}



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
