#!/usr/bin/env node
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

var colors = require('colors')

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

Object.defineProperty(String.prototype, 'raw', {
	get: function(){
		return this.replace(/\x1b\[..?m/g, '') }, })


// get all keys accessible from object...
var deepKeys = function(obj, stop){
	var res = []
	while(obj !== stop && obj != null){
		res.push(Object.keys(obj))
		obj = obj.__proto__ }
	return [...(new Set(res.flat()))] }


// compare two arrays by items...
var arrayCmp = function(a, b){
	var ka = Object.keys(a)
	var kb = Object.keys(a)
	return a === b
		|| ka.length == kb.length
		&& ka
			// keep only non matching stuff...
			.filter(function(k){
				return a[k] !== b[k] 
					&& a[k] != a[k] })
			.length == 0 }



// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

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
			&& console.log(pre +': '+ msg.bold, ...args)
		console.assert(e, pre.bold +': '+ msg.bold.yellow, ...args)
		return e } }



// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

// basic argv parser...
//
// Format:
// 	{
// 		// alias...
// 		v: 'verbose',
// 		// handler...
// 		verbose: function(opt, rest){
// 			...
// 		},
//
//	    t: 'test',
//		test: {
//			doc: 'test option.',
//			arg: 'VALUE',
//			handler: function(value, opt, rest){ 
//				...
//			}},
//
// 		...
// 	}
//
// XXX add features:
// 		- option groups -- nested specs...
// 		- arg value type conversion???
// 		- make this a constructor???
// 		- extend this to support command calling...
// XXX do we handle = for options with values???
// XXX move this to it's own lib...
// 		argv-handler
// 		...
// XXX need better test processing:
// 		- line breaks
// 		- ...
// XXX revise...
var ArgvParser = function(spec){
	// spec defaults...
	// NOTE: this is intentionally not dynamic...
	spec = Object.assign({
		// builtin options...
		h: 'help',
		// XXX revise...
		help: {
			doc: 'print this message and exit.',
			handler: function(){
				var spec = this.spec
				var that = this
				console.log([
					`Usage: ${ 
						typeof(spec.__usage__) == 'function' ? 
							spec.__usage__.call(this) 
							: spec.__usage__ }`,
					// doc...
					...(spec.__doc__ ?
						['', typeof(spec.__doc__) == 'function' ?
							spec.__doc__()
							: spec.__doc__]
						: []),
					// options...
					'',
					'Options:',
					...(spec.__getoptions__()
						.map(function([opts, arg, doc]){
							return ['-'+opts.join(' | -') +' '+ (arg || ''), doc] })),
					// examples...
					...(this.spec.__examples__ ?
						['', 'Examples:', ...(
							this.spec.__examples__ instanceof Array ?
								spec.__examples__
									.map(function(e){ 
										return e instanceof Array ? e : [e] })
								: spec.__examples__.call(this) )]
						: []),
					// footer...
					...(this.spec.__footer__?
						['', typeof(this.spec.__footer__) == 'function' ? 
							spec.__footer__.call(this) 
							: spec.__footer__]
						: []) ]
				.map(function(e){
					return e instanceof Array ?
						spec.__align__(...e
								.map(function(s){ 
									return s.replace(/\$scriptname/g, that.scriptname) }))
							// indent lists...
							.map(function(s){
								return '\t'+ s })
						: e })
				.flat()
				.join('\n')
				.replace(/\$scriptname/g, this.scriptname)) 

				process.exit() }},

		// special values and methods...
		__opts_width__: 3,
		__doc_prefix__: '- ',

		// these is run in the same context as the handlers... (XXX ???)
		__align__: function(a, b, ...rest){
			var opts_width = this.__opts_width__ || 4
			var prefix = this.__doc_prefix__ || ''
			b = [b, ...rest].join('\n'+ ('\t'.repeat(opts_width+1) + ' '.repeat(prefix.length)))
			return b ?
				(a.raw.length < opts_width*8 ?
					[a +'\t'.repeat(opts_width - Math.floor(a.raw.length/8))+ prefix + b]
					: [a, '\t'.repeat(opts_width)+ prefix + b])
				: [a] },

		__usage__: function(){
			return `${ this.scriptname } [OPTIONS]` },
		__examples__: undefined,
		__footer__: undefined,

		__unknown__: function(key){
			console.error('Unknown option:', key)
			process.exit(1) }, 

		// these are run in the context of spec...
		__getoptions__: function(){
			var that = this
			var handlers = {}
			Object.keys(this)
				.forEach(function(opt){
					// skip special methods...
					if(/^__.*__$/.test(opt)){
						return }
					var [k, h] = that.__gethandler__(opt)
					handlers[k] ?
						handlers[k][0].push(opt)
						: (handlers[k] = [[opt], h.arg, h.doc || k, h]) })
			return Object.values(handlers) },
		__gethandler__: function(key){
			var seen = new Set([key])
			while(key in this 
					&& typeof(this[key]) == typeof('str')){
				key = this[key] 
				// check for loops...
				if(seen.has(key)){
					throw Error('Option loop detected: '+ ([...seen, key].join(' -> '))) }
				seen.add(key) }
			return [key, this[key]] },
	}, spec)

	// sanity check -- this will detect argument loops...
	spec.__getoptions__()

	return function(argv){
		var pattern = /^--?[a-zA-Z-]*$/
		argv = argv.slice()
		var context = {
			spec: spec,
			argv: argv.slice(),

			interpreter: argv.shift(),
			script: argv[0],
			scriptname: argv.shift().split(/[\\\/]/).pop(),

			rest: argv,
		}
		var other = []
		while(argv.length > 0){
			var arg = argv.shift()
			// options...
			if(pattern.test(arg)){
				var handler = spec.__gethandler__(arg.replace(/^--?/, '')).pop()
						|| spec.__unknown__
				// get option value...
				var value = (handler.arg && !pattern.test(argv[0])) ?
						argv.shift()
					: undefined
				// run handler...
				;(typeof(handler) == 'function' ?
						handler
						: handler.handler)
					.call(context, 
						// pass value...
						...(handler.arg ? [value] : []), 
						arg, 
						argv)
				continue }
			other.push(arg) }
		return other } }



//---------------------------------------------------------------------
// Tests...

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
	
	// compatibility: native constructors...
	js_constructors: function(assert){
		var X, Y, Z, a, b, c, d
		return {
			Object,
			Array,
			Number,
			Map,
			Set,
		}},
	// compatibility: prototype tree...
	js_prototype: function(assert){
		var a, b, c, d
		return {
			a: a = {
				x: 'a',
				method: function(){
					return 'a' },
			},
			b: b = {
				__proto__: a,
				x: 'b',
			}, 
			c: c = {
				__proto__: b,
				x: 'c',
				method: function(){
					assert(arrayCmp(
						object.values(c, 'x').join(''), 
						['c', 'a', 'b']), 
							'reach all values of attr')
					assert(arrayCmp(
						object.sources(c, 'method'), 
						[c, a]), 
							'reach all values of method')
					assert(object.parent(c, 'x') == 'b', 'reach parent attr')
					assert(object.parentCall(c.method, this) == 'a', 'reach parent method', 'c')
					return 'c' },
			}, 
			d: d = {
				__proto__: c,
				method: function(){
					assert(object.parentCall(d.method, this) == 'c', 'reach parent method', 'd')
					return 'd' },
			},
		}},
	// compatibility: class/instance...
	js_class: function(assert){
		var X, Y, Z
		return {
			X: X = class {
				x = 'x'
				method(){
					return 'x' }
			},
			Y: Y = class extends X {
				x = 'y'
			},
			Z: Z = class extends Y {
				x = 'z'
				method(){
					assert(arrayCmp(
						object.values(c, 'x').join(''), 
						['z', 'y', 'x']), 
							'reach all values of attr (class)')
					assert(arrayCmp(
						object.sources(c, 'method'), 
						[Z.prototype, X.prototype]), 
							'reach all values of method (class)')
					assert(
						object.parent(c, 'x') == super.x, 
							'reach super attr (class)')
					assert(
						object.parentCall(c.method, this) == super.method(), 
							'reach super method (class)')
					return 'c' }
			},
		}},
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
				// native JS constructors do not support no_new or raw modes...
				if((mode == 'raw' || mode == 'no_new') && !O.__rawinstance__){
					return res }
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
	mod = chain_length == 2 ? 
		'as-is' 
		: mod

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
	var chains = 
		ArgvParser({
			// doc...
			__usage__: `$scriptname [OPTIONS] [CHAIN] ...`,
			__doc__: object.normalizeTextIndent(
				`Run tests on object.js module.

				Tests run by $scriptname can be specified in one of the 
				following formats:

						<case>
						<setup>:<test>
						<setup>:<modifier>:<test>

				Each of the items in the test spec can be a "*" indicating
				that all relevant items should be used, for example:

						${ '$ ./$scriptname basic:*:*'.gray }

				Here $scriptname is instructed to run all tests and modifiers
				only on the basic setup.

				Zero or more sets of tests can be specified.

				When no tests specified $scriptname will run all tests.
				`),
			__examples__: [
				['$ ./$scriptname'.gray, 
					'run all tests.'],
				['$ ./$scriptname basic:*:*'.gray, 
					'run all tests and modifiers on "basic" setup.',
					'(see '+ '$scriptname -l'.gray +' for more info)'],
				['$ ./$scriptname -v example'.gray, 
					'run "example" test in verbose mode.'],
				['$ ./$scriptname native:gen3:methods init:gen3:methods'.gray, 
					'run two tests/patterns.'],
				['$ export VERBOSE=1 && ./$scriptname'.gray, 
					'set verbose mode globally and run tests.'],
			],
			// options...
			l: 'list',
			list: {
				doc: 'list available tests.',
				handler: function(){
					console.log(object.normalizeTextIndent(
						`Tests run by %s can be of the following forms:

							<case>
							<setup>:<test>
							<setup>:<modifier>:<test>

						Setups:
							${ Object.keys(setups).join('\n\
							') }

						Modifiers:
							${ Object.keys(modifiers).join('\n\
							') }

						Tests:
							${ Object.keys(tests).join('\n\
							') }

						Standalone test cases:
							${ Object.keys(cases).join('\n\
							') }
						`), this.scriptname)
					process.exit() }},
			v: 'verbose',
			verbose: {
				doc: 'verbose mode (defaults to: $VERBOSE).',
				handler: function(){
					module.VERBOSE = true }},
		})(process.argv)

	// run the tests...
	var stats = {}
	chains.length > 0 ?
		chains
			.forEach(function(chain){
				runner(chain, stats) })
		: runner('*', stats)

	// print stats...
	console.log('Tests run:', stats.tests, 
		'  Assertions:', stats.assertions, 
		'  Failures:', stats.failures,
		`  (${stats.time}ms)`.bold.black) 

	// report error status to the OS...
	process.exit(stats.failures)
}




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
