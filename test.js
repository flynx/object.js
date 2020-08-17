#!/usr/bin/env node
/**********************************************************************
* 
* TODO:
* 	- test: 
* 		- object.mixout(..)
* 		- object.normalizeTextIndent(..)
* 		- object.doc`...`
* 		- object.text`...`
* 		- callback STOP in object.mixins(..)
* 		- props arg in object.values(..)
* 		- RawInstance(..).toString()
*
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var colors = require('colors')

var test = require('ig-test')

var object = require('./object')


//---------------------------------------------------------------------
// helpers...

// compare two arrays by items...
var arrayCmp = function(a, b){
	var ka = Object.keys(a)
	var kb = Object.keys(a)
	return a === b
		|| (a.length == b.length
			&& ka
				// keep only non matching stuff...
				.filter(function(k){
					return a[k] !== b[k] 
						&& a[k] != a[k] })
				.length == 0) }

// a constructor is a thing that starts with a capital and has a .prototype
var constructors = function(obj){
	return Object.entries(obj)
		.filter(function([k, o]){
			return !k.startsWith('_')
				&& k[0] == k[0].toUpperCase() 
				&& o.prototype }) }

// an instance is a thing that starts with a lowercase and has a .constructor
var instances = function(obj){
	return Object.entries(obj)
		.filter(function([k, o]){
			return !k.startsWith('_')
				&& k[0] == k[0].toLowerCase() 
				&& o.constructor }) }



//---------------------------------------------------------------------
// Tests...

var setups = test.Setups({
	// basic constructor and inheritance...
	//
	//	X
	//	Y <- A <- B <- C <- D <- E	
	//
	// This will test:
	// 	- object creation
	// 	- basic inheritance
	// 		- general usecase
	// 		- .__extends__
	// 	- method overloading
	// 		- .parent(..)
	// 		- .parentCall(..)
	// 		- .parentProperty(..)
	// 	- constructor methods (XXX not done...)
	//
	basic: function(assert){
		var X, Y, A, B, C, D, E
		return {
			X: X = assert(object.Constructor('X'), `.Constructor(..)`),
			Y: Y = assert(object.C('Y', { 
				method: function(){
					var x
					assert(
						(x = object.parentCall(Y.prototype.method, this, ...arguments)) === undefined, 
						'y.method(..): expected:', undefined, 'got:', x)
					return 'Y'
				},
			}), `.C(..)`),

			A: A = assert(object.C('A', Y, { 
				get prop(){
					return 'A.prop' },
				method: function(){
					var x
					assert(
						(x = object.parentCall(A.prototype.method, this, ...arguments)) == 'Y', 
						'a.method(..): expected:', 'Y', 'got:', x)
					return 'A'
				},
			}), `inherit (gen1)`),
			B: B = assert(object.C('B', A, { 
				// XXX constructor methods...
				testRelations: function(){
					assert(object.parentOf(A, this), 
						'parentOf(A, B): expected to be true')
					assert(object.childOf(this, A), 
						'childOf(B, A): expected to be true')

					assert(!object.parentOf(X, this), 
						'parentOf(X, B): expected to be false')

					assert(object.parentOf(A, E), 
						'parentOf(A, E): expected to be true')
					assert(object.childOf(E, A), 
						'childOf(E, A): expected to be true')

					assert(object.related(A, E) && object.related(E, A), 
						'related(A, E) and related(E, A): expected to be true')

					assert(!object.related(X, E) 
						&& !object.related(E, X), 
						'related(X, E) and related(E, X): expected to be flase')
				},
			}, { 
				get prop(){
					return 'B.prop' },
				// XXX methods...
			}), `inherit (gen2) with constructor mixin`),
			C: C = assert(object.C('C', B, { 
				method: function(){
					var x
					assert(
						(x = object.parentCall(C.prototype.method, this, ...arguments)) == 'A', 
						'c.method(..): expected:', 'A', 'got:', x)

					assert(this.prop == 'B.prop', 
						'get property value')
					// NOTE: these get "next visible" not "outside current object",
					// 		this is intentional, the "outside" value is simply 
					// 		accessible via:
					// 			C.prototype.prop
					assert(object.parent(C.prototype, 'prop') == 'A.prop', 
						'get parent property value')
					assert(object.parentProperty(C.prototype, 'prop').get() == 'A.prop', 
						'get parent property')

					assert(object.parentProperty(C.prototype, 'does-not-exist') === undefined, 
						'get non-existent property')

					return 'C'
				},
			}), `inherit (gen3)`),
			D: D = assert(object.C('D', {}, {
				__extends__: C,
				method: function(){
					var x
					assert(
						(x = object.parentCall(D.prototype.method, this, ...arguments)) == 'C', 
						'c.method(..): expected:', 'C', 'got:', x)
					return 'D'
				},
			}), '.__extends__ test'),
			E: E = assert(object.C('E', {
				__extends__: C,
			}, {
				method: function(){
					var x
					assert(
						(x = object.parentCall(D.prototype.method, this, ...arguments)) === undefined, 
						'c.method(..): expected:', undefined, 'got:', x)
					return 'E'
				},
			}), '.__extends__ test'),
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
					assert(
						object.parentCall(B.prototype, '__call__', this, ...arguments) === undefined, 
							'call non-existent parent method', 'B')
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

	// compatibility: native constructors...
	js_constructors: function(assert){
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
					var x, y
					assert.array(
						object.values(c, 'x'), 
						['c', 'a', 'b'], 
							'reach all values of attr')
					assert.array(
						object.values(c, 'x', function(v, o){
							return v.toUpperCase() }), 
						['C', 'A', 'B'], 
							'reach all values of attr')
					assert.array(
						object.sources(c, 'method'),
						// NOTE: not passing an explicit list as we need 
						// 		to account for mixins...
						object.sources(c)
								.filter(function(s){ 
									return s.hasOwnProperty('method') }), 
							'reach all values of method')
					assert(
						(x = object.parent(c, 'x')) == 'b', 
							'reach parent attr: expected:', 'b', 'got:'.bold.yellow, x)
					assert(
						(x = object.parentCall(c.method, this)) == (y = a.method()), 
							'reach parent method: expected:', y, 'got:'.bold.yellow, x)
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
					// XXX this is almost the same as for js_prototype...
					assert.array(
						object.values(c, 'x'), 
						['z', 'y', 'x'], 
							'reach all values of attr (class)')
					assert.array(
						object.values(c, 'x', function(v, o){
							return v.toUpperCase() }), 
						['C', 'A', 'B'], 
							'reach all values of attr (class)')
					assert.array(
						object.sources(c, 'method'), 
						[Z.prototype, X.prototype], 
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
})


var modifiers = test.Modifiers({
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

	// create instance clones via Object.create(..)
	//
	clones: function(assert, setup){
		return instances(setup)
			.reduce(function(res, [k, o]){
				res[k] = Object.create(o) 
				return res }, {}) },

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
					// XXX need to test this for constructor mixins too...
					&& !(O.__mixin_constructors && !O.__mixin_flat)
					&& assert(o instanceof o.constructor.__proto__, `instanceof-nested:`, k)

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

	// mixins...
	// NOTE: running this in flat mode will have side-effects -- overwriting
	// 		existing attributes and methods...
	// XXX might be a good idea to get the method name from the context... how?
	mixin_instance: function(assert, setup, flat, filter, get){
		filter = filter || instances
		var attr = '__mixin_' + filter.name

		var mixin = setup[attr] = {
			// NOTE: in the real world mixins should have no state, just 
			// 		methods...
			__mixin: true,
			[attr]: true,
			__mixin_flat: !!flat, 

			method: function(){
				var res = object.parent(mixin.method, this) !== undefined ?
					assert(
						object.parentCall(mixin.method, this, ...arguments),
							'mixin method parent call')
					: false 
				return res 
					|| 'mixin' },

			mixinMethod: function(){
				return 'mixin' },
		}

		mixin[attr] = mixin
		filter(setup)
			.forEach(function([n, o]){
				o = get ? get(o) : o
				// mixin once per chain...
				if(!o || o[attr]){
					return }
				assert(!object.hasMixin(o, mixin), 'pre mixin test', n)
				assert(flat ?
						object.mixinFlat(o, mixin)
						: object.mixin(o, mixin), 
					flat ? 
						'mixin (flat)'
						:'mixin', n)
				assert(object.hasMixin(o, mixin), 'mixin test', n)
				assert(o.mixinMethod() == 'mixin', 'mixin method call')
			})
		return setup },
	mixin_instance_flat: function(assert, setup){
		return this.mixin_instance(assert, setup, true) },
	mixin_constructor: function(assert, setup, flat){
		return this.mixin_instance(assert, setup, false, constructors) },
	mixin_constructor_proto: function(assert, setup, flat){
		return this.mixin_instance(assert, setup, false, constructors, 
			function(o){ 
				// skip mixing into Object.prototype...
				return o !== Object 
					&& o.prototype }) },
	mixin_constructor_flat: function(assert, setup){
		return this.mixin_constructor_proto(assert, setup, true) },
	/*/ XXX
	mixout: function(assert, setup){
		return {}
	},
	//*/

	// sanity checks...
	//
	// NOTE: these should have no side-effects but since we can run 
	// 		them why not run them and verify ;)
	get methods(){ return tests.methods },
	get constructor_methods(){ return tests.constructor_methods },
	get callables(){ return tests.callables },
})


var tests = test.Tests({
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
				object.deepKeys(o)
					.forEach(function(m){
						typeof(o[m]) == 'function'
							// skip special methods...
							&& !m.startsWith('__')
							&& o[m]() }) })
		return setup },
	constructor_methods: function(assert, setup){
		constructors(setup)
			.forEach(function([k, O]){
				object.deepKeys(O)
					.forEach(function(m){
						typeof(O[m]) == 'function'
							// skip special methods...
							&& !m.startsWith('__')
							&& O[m]() }) })
		return setup },

	// callables...
	callables: function(assert, setup){
		// test special case .values(x, '__call__')
		var test = function(obj, name){
			var a, b
			return assert(arrayCmp(
				a = object.values(obj, '__call__')
					.map(function(func){
						return func.call(obj) })
					.flat(), 
				// get all callables in prototype chain and call them...
				b = object.sources(obj)
					.filter(function(o){ 
						return typeof(o) == 'function' 
							|| o.hasOwnProperty('__call__') })
					.map(function(o){ 
						return o.hasOwnProperty('__call__') ?
							o.__call__.call(obj)
							// NOTE: not all callables are instances of Function...
							: Reflect.apply(Function.prototype, o, [obj]) })), 
				'values of .__call__ of '+ name +': got:', a, 'expected:', b) }

		instances(setup)
			.filter(function([_, o]){
				// NOTE: not all callables are instances of Function...
				return typeof(o) == 'function' 
					|| !!o.__call__ })
			.forEach(function([k, o]){
				o.__non_function ?
					assert(!(o instanceof Function), 'non-instanceof Function', k)
					: assert(o instanceof Function, 'instanceof Function', k)

				typeof(o) == 'function'
					&& assert(o(), 'call', k) 
				
				assert(o.call(), '.call(..)', k)
				assert(o.apply(), 'apply(..)', k)
				assert(o.bind(null)(), '.bind(..)(..)', k)

				test(o, k)
			}) 
		return setup },
})


var cases = test.Cases({
	'edge-cases': function(assert){

		assert.error('double __extends__ fail', function(){
			var X = object.C('X', {
				__extends__: Object,
			}, {
				__extends__: Function,
			})
		})

		// native constructor...
		assert.array(
			object.RawInstance(null, Array, 'a', 'b', 'c'), 
			['a', 'b', 'c'], 
			'native constructor')
		assert(object.RawInstance(null, Number, '123') == 123, 'native constructor')


		var x, y

		// object.match(..)
		assert(object.match(x = {a: 123, b: '333', c: []}, x) === true, 'match self')
		assert(object.match(x, {a: x.a, b: x.b, c: []}) == false, 'strict mismatch')
		assert(object.match(x, {a: 123, b: 333, c: x.c}, true) === true, 'non-strict match')

		// object.matchPartial(..)
		assert(object.matchPartial(x, {a: x.a}, true) === true, 'non-strict partial match')
		assert(object.matchPartial(x, {a: x.a, b: x.b, c: x.c}) === true, 'strict partial match')

		// object.parent(..)
		assert(object.parent({}) === {}.__proto__, 'basic proto')
		assert.error('.parent(..) of anonymous function', function(){ 
			object.parent(function(){}, {}) })
	},
	deepKeys: function(assert){
		var a = {
			a: true
		}
		var b = {
			__proto__: a,
			b: true,
		}
		var c = {
			__proto__: b,
			c: true,
		}

		assert.array(object.deepKeys(c), ['c', 'b', 'a'], 'full chain')
		assert.array(object.deepKeys(c, a), ['c', 'b', 'a'], 'full chain')
		assert.array(object.deepKeys(c, b), ['c', 'b'], 'partial chain')
		assert.array(object.deepKeys(c, c), ['c'], 'partial chain')

	},
	funcMethods: function(assert){
		var X = object.C('X', {
			__call__: function(){
				return true },
		})

		var x = new X()

		assert(x(), 'x()')
		assert(x.call(null), 'x.call(null)')

		var xx = Object.create(x)

		assert(typeof(xx.call) == 'function', 'xx.call is a function')
		assert(xx.call(null), 'xx.call(null)')
	},
})



//---------------------------------------------------------------------

typeof(__filename) != 'undefined'
	&& __filename == (require.main || {}).filename
	&& test.run()




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
