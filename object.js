/**********************************************************************
* 
* object.js
*
* This is a set of tools and abstractions to create and manage 
* constructors, objects and prototype chains in idiomatic JavaScript.
*
* Motivation:
* 	This package was originally written to unify low level object 
* 	definitios within a large project and from there evolved to be a 
* 	full functional alternative to the ES6 class notation with all of 
* 	its inconsistencies, hoops, "the same but slightly different" ways 
* 	to do things and "magic" (hidden) functionality.
*
* Repo and docs:
* 	https://github.com/flynx/object.js
*
*
***********************************************/ /* c8 ignore next 2 */
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var doc = require('ig-doc')

module.doc = doc.doc
module.text = doc.text
module.normalizeIndent = doc.normalizeIndent
module.normalizeTextIndent = doc.normalizeTextIndent

var STOP =
module.STOP = 
	require('ig-stoppable').STOP


//---------------------------------------------------------------------

// Function methods to link into a constructor producing a callable 
// defined via .__call__(..)
//
// These are needed to support the expected popular function API in a 
// callable potentially not related to a function.
//
// see: Constructor(..) for details.
module.LINK_FUNCTION_METHODS = [
	'call',
	'apply',
	'bind',
]




//---------------------------------------------------------------------
// Helpers...

// Bootstrapping utility...
//
// Since we can face chicken-egg issues here, this should keep things 
// both consistent in terms of doc flow and in terms of actual logical 
// consistency...
//
var BOOTSTRAP = 
function(func){
	var b = BOOTSTRAP.__delayed = 
		BOOTSTRAP.__delayed 
			|| []
	func ?
		b.push(func)
		: b.map(function(f){ f() }) }



// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

// Get keys from prototype chain...
//
// 	deepKeys(obj[, all])
// 	deepKeys(obj, stop[, all])
// 		-> keys
//
// 	List all keys incuding non-enumerable...
// 	deepKeys(obj, true)
// 	deepKeys(obj, stop, true)
// 		-> keys
//
//
// NOTE: this is like Object.keys(..) but will get keys for all levels 
// 		till stop if given...
// NOTE: by default this lists only enumerable keys...
var deepKeys =
module.deepKeys =
function(obj, stop, all){
	all = arguments[arguments.length-1]
	all = (all === true || all === false) ?
		all
		: false
	stop = (stop === true || stop === false) ? 
		undefined 
		: stop
	var res = []
	while(obj != null){
		res.push(Object.keys(all ?
			Object.getOwnPropertyDescriptors(obj)
			: obj))
		if(obj === stop){
			break }
		obj = obj.__proto__ }
	return [...(new Set(res.flat()))] }


// Match two objects...
//
// 	match(a, b)
// 		-> bool
//
//
// This will match objects iff:
// 	- if they are identical or
// 	- attr count is the same and,
// 	- attr names are the same and,
// 	- attr values are identical.
//
//
// 	Non-strict match...
// 	match(a, b, true)
//
// This is similar to the default case but uses equality rather than 
// identity to match values.
//
//
// NOTE: this will do a shallow test using Object.keys(..) thus .__proto__
// 		attributes are ignored...
var match = 
module.match =
function(base, obj, non_strict){
	// identity...
	if(base === obj){
		return true }
	// typeof -- sanity check...
	if(typeof(base) != typeof(obj)){
		return false }
	// attr count...
	var o = Object.keys(Object.getOwnPropertyDescriptors(obj))
	if(Object.keys(Object.getOwnPropertyDescriptors(base)).length 
			!= o.length){
		return false }
	// names and values...
	o = o.map(function(k){
			return [k, obj[k]] })
	while(o.length > 0){
		var [k, v] = o.pop()
		if(!base.hasOwnProperty(k) 
				|| (non_strict ? 
					base[k] != v 
					: base[k] !== v)){
			return false } }
	return true }


// Like .match(..) but will test if obj is a non-strict subset of base...
//
// NOTE: this will only check direct attributes of both base and obj.
var matchPartial =
module.matchPartial = 
function(base, obj, non_strict){
	return base === obj 
		|| Object.entries(obj)
			.filter(function([n, v]){
				return !base.hasOwnProperty(n) 
					|| (non_strict ?
						base[n] != v
						: base[n] !== v) })
			.length == 0 }


// like Object.create(..) but also handles callable objects correctly...
//
// 	create(obj)
// 		-> obj
//
// 	create(func)
// 	create(name, func)
// 		-> func
//
//
// XXX would be nice to re-use RawInstance... or use create(..) from 
// 		RawInstance...
// XXX should we autogenerate a descriptive name???
// XXX revise .toString(..) creation...
var create =
module.create =
function(obj){
	// name given...
	var name = ''
	if(typeof(obj) == 'string' 
			&& arguments.length > 1){
		;[name, obj] = arguments 
		// sanity check...
		if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name.trim())){
			throw new Error(`create(..): invalid name: "${name}"`) } }
	// calable...
	if(typeof(obj) == 'function'){
		// NOTE: this is ignored by c8 as we will never run this directly 
		// 		as it will immediately get eval(..)'ed...
        /* c8 ignore next 9 */
		var func = function(){
			return '__call__' in func ?
					func.__call__(this, ...arguments)
				: 'call' in obj ?
					obj.call(func, ...arguments)
				// NOTE: if obj does not inherit from Function .call(..)
				// 		might not be available directly so it is saver to
				// 		use Reflect.apply(..)...
				: Reflect.apply(obj, func, [...arguments]) }
		// rename...
		// NOTE: we just created func(..) so no need to sanitize it, the 
		// 		only potential vector of atack (AFAIK) here is name and 
		// 		that is checked above...
		func = eval('('+ 
			func
				.toString()
				.replace(/function\(/, `function ${name}(`) +')')
		//Object.defineProperty(func, 'name', {value: name})
		/* XXX NAME...
		//func.name = name
		func.name != name
			&& (func = eval('('+ 
				func
					.toString()
					.replace(/function\(/, `function ${name}(`) +')'))
		//*/
		func.__proto__ = obj
		__toStringProxy(func)
		return func }
	// normal object...
	return Object.create(obj) }



//---------------------------------------------------------------------
// Helper objects/constructors...

var ASIS =
module.ASIS = 
function ASIS(value){
	return {
		__proto__: ASIS.prototype,
		value, 
	} }


BOOTSTRAP(function(){

	// Error with some JS quirks fixed...
	//
	// XXX EXPERIMENTAL
	module.Error =
		Constructor('Error', Error, {
			get name(){
				return this.constructor.name },

			// XXX BUG? is this an error that with this everything seems
			// 		to work while without this instances of this work
			// 		fine while instances of "sub-classes" do not set 
			// 		the .stack correctly???
			// 		...is this a JS quirk or am I missing something???
			__new__: function(context, ...args){
				return Reflect.construct(
					module.Error.__proto__, args, this.constructor) },
				//return Reflect.construct(Error, args, this.constructor) },
		})

})



//---------------------------------------------------------------------
// Prototype chain content access...

// Get source objects for a prop/attr name...
//
// 	sources(obj, name)
// 		-> iterator
//
// 	Get full chain...
// 	sources(obj)
// 		-> iterator
//
// 	Get callables or objects defining .__call__ (special-case)
// 	sources(obj, '__call__')
// 		-> iterator
//
//
// NOTE: this goes up the prototype chain, not caring about any role (
// 		instance/class or instance/prototype) bounderies and depends 
// 		only on the object given as the starting point.
// 		It is possible to start the search from this, thus checking
// 		for any overloading in the instance, though this approach is 
// 		not very reusable....
// NOTE: this will not trigger any props...
var sources =
module.sources =
function*(obj, name=undefined){
	while(obj != null){
		if(name === undefined
				|| obj.hasOwnProperty(name)
				|| (name == '__call__' 
					&& typeof(obj) == 'function')){
			yield obj }
		obj = obj.__proto__ } }


// Get object-value/prop pairs set in source objects for a prop/attr name...
// 	
// 	entries(obj, name)
// 		-> iterator
//
// 	Get propery descriptors...
// 	entries(obj, name, true)
// 		-> iterator
//
//
// Item format:
// 	[
// 		source,
// 		value,
// 	]
//
//
// Special case: name is given as '__call__'
// 		This will return either the value the object if it is callable 
// 		or the value of .__call__ attribute...
//
//
// NOTE: for more docs see sources(..)
var entries =
module.entries =
function*(obj, name, props=false){
	for(var obj of sources(obj, name)){
		yield [
			obj, 
			props ?
				Object.getOwnPropertyDescriptor(obj, name)
			// handle callable instance...
			: !(name in obj) 
					&& name == '__call__' 
					&& typeof(obj) == 'function' ?
				obj
			: obj[name],
		] }}


// Get values/props set in source objects for a prop/attr name...
//
// NOTE: this is specialization of entries(..), see that for more info.
var values =
module.values =
function*(obj, name, props=false){
	for(var [_, value] of entries(...arguments)){
		yield value }}


// Find the next parent attribute in the prototype chain.
//
// 	Get parent attribute value...
// 	parent(proto, name)
// 		-> value
// 		-> undefined
//
// 	Get parent callable or .__call__ value (special-case)
// 	parent(proto, '__call__')
// 		-> value
// 		-> undefined
//
// 	Get parent method...
// 	parent(method, this)
// 		-> meth
// 		-> undefined
//
// 	Get parent object...
// 	parent(this)
// 		-> parent
//
// 
// The two forms differ in:
// 	- in parent(method, ..) a method's .name attr is used for name.
// 	- in parent(method, ..) the containing prototype is inferred.
//
// NOTE: there are cases where method.name is not set (e.g. anonymous 
// 		function), so there a name should be passed explicitly...
// NOTE: when passing a method it is recommended to pass an explicit 
// 		reference to it relative to the constructor, i.e.:
// 			Constructor.prototype.method
// 		this will avoid relative resolution loops, for example: 
// 			this.method 
// 		deep in a chain will resolve to the first .method value visible 
// 		from 'this', i.e. the top most value and not the value visible
// 		from that particular level...
//
//
// Example:
// 		var X = object.Constructor('X', {
//			__proto__: Y.prototype,
//
//			attr: 123,
//
// 			method: function(){
// 				// get attribute...
// 				var a = object.parent(X.prototype, 'attr')
//
// 				// get method...
// 				var ret = object.parent(X.prototype.method, this)
// 					.call(this, ...arguments)
//
// 				// ...
// 			}
// 		})
//
//
// NOTE: in the general case this will get the value of the returned 
// 		property/attribute, the rest of the way passive to props.
// 		The method case will get the value of every method from 'this' 
// 		and to the method after the match.
// NOTE: this is super(..) replacement, usable in any context without 
// 		restriction -- super(..) is restricted to class methods only...
// NOTE: contrary to sources(..) in the .__call__ case, this will skip 
// 		the base callable instance, this will make both the following
// 		cases identical:
// 			parent(C.prototype.__call__, obj)
// 		and:
// 			parent(C.prototype, '__call__')
var parent =
module.parent =
function(proto, name){
	// special case: get parent...
	if(arguments.length == 1){
		return proto.__proto__ }
	// special case: get method...
	if(typeof(name) != typeof('str')){
		var that = name
		name = proto.name
		// sanity check...
		if(name == ''){
			throw new  Error('parent(..): need a method with non-empty .name') }
		// get first matching source...
		var i = 0
		for(var obj of sources(that, name)){
			// NOTE: the .hasOwnProperty(..) test is here so as 
			// 		to skip the base callable when searching for 
			// 		.__call__ that is returned as a special case 
			// 		by source(..) and this should have no effect 
			// 		or other cases...
			// NOTE: this will only skip the root callable...
			if((i++ > 0 || obj.hasOwnProperty(name))
					&& obj[name] === proto){
				proto = obj
				break }}}
	// get first source...
	var res = sources(proto, name)
	res.next()
	res = res.next().value
	return !res ?
			undefined
		:(!(name in res) && typeof(res) == 'function') ?
			res
		: res[name] }


// Find the next parent property descriptor in the prototype chain...
//
// 	parentProperty(proto, name)
// 		-> prop-descriptor
//
//
// This is like parent(..) but will get a property descriptor...
var parentProperty =
module.parentProperty =
function(proto, name){
	// get second source...
	var res = sources(proto, name)
	res.next()
	res = res.next().value
	return res ?
		// get next value...
		Object.getOwnPropertyDescriptor(res, name)
		: undefined }


// Find the next parent method and call it...
//
// 	parentCall(proto, name, this, ..)
// 	parentCall(meth, this, ..)
// 		-> res
// 		-> undefined
//
//
// This also gracefully handles the case when no higher level definition 
// is found, i.e. the corresponding parent(..) call will return undefined
// or a non-callable.
//
// NOTE: this is just like parent(..) but will call the retrieved method,
// 		essentially this is a shorthand to:
// 			parent(proto, name).call(this, ...)
// 		or:
// 			parent(method, this).call(this, ...)
// NOTE: for more docs see parent(..)
var parentCall =
module.parentCall =
function(proto, name, that, ...args){
	var meth = parent(proto, name)
	return typeof(meth) == 'function' ?
		meth.call(...( typeof(name) == typeof('str') ?
			[...arguments].slice(2)
			: [...arguments].slice(1) ))
		: undefined }


// Test if child is related to parent...
//
// 	parentOf(parent, child)
// 		-> bool
//
//
// NOTE: this is like a instanceof b but within the prototype chain
var parentOf =
module.parentOf =
function(parent, child){
	return new Set([...sources(child)]).has(parent) }

// Reverse of parentOf(..)
var childOf =
module.childOf =
function(child, parent){
	return parentOf(parent, child) }

var related =
module.related =
function(a, b){
	return parentOf(a, b) 
		|| parentOf(b, a) }



//---------------------------------------------------------------------
// Constructor...

// Create a .toString(..) proxy
//
// This is needed to show the user code instead of the library code that 
// callas it...
var __toStringProxy = 
//module.__toStringProxy =
function(func){
	Object.defineProperty(func, 'toString', {
		value: function toString(...args){
			var f = (
				// explicitly defined .toString(..)
				this.__proto__.toString !== Function.prototype.toString 
						&& this.__proto__.toString !== Object.prototype.toString ?
					this.__proto__
				// use .__call__...
				: '__call__' in this ?
					this.__call__
				: this.__proto__)
			return doc.normalizeIndent(f.toString(...args)) },
		enumerable: false,
	})
	return func }

// Make an uninitialized instance from a constructor...
//
// 	RawInstance(context, constructor, ...)
// 		-> instance
//
//
// This will:
// 	- construct an object
// 		- if .__new__(..) is defined
// 			-> call and use its return value
//		- if prototype is a function or if .__call__(..) is defined
//			-> use a wrapper function
//		- if construct.__proto__ has .__rawinstance__(..)
//			-> use it to create an instance
//		- if constructor.__proto__ is a constructor
//			-> use it to create an instance
//		- else
//			-> use {}
// 	- link the object into the prototype chain
//
//
// This will not call .__init__(..), hence the "uninitialized".
//
//
// NOTE: "context" is only used when passeding to .__new__(..) if defined, 
// 		and is ignored otherwise...
// NOTE: as this is simply an extension to the base JavaScript protocol this
// 		can be used to construct any object...
// 		Example:
// 			// new is optional...
// 			var l = new RawInstance(null, Array, 'a', 'b', 'c')
// NOTE: the following are not the same in structure but functionally 
// 		are identical:
// 			var C = Constructor('C', function(){ .. })
// 		and
// 			var C2 = Constructor('C2', { __call__: function(){ .. } })
// 		the difference is in C.prototype vs. C2.prototype, the first 
// 		being a function while the second is an object with a call 
// 		method...
// NOTE: essentially this is an extended version of Reflect.construct(..)
//
// XXX need a way to set .name of a callable instance...
// XXX need to auto-generate .name for callable instances...
var RawInstance = 
module.RawInstance =
function(context, constructor, ...args){
	var obj =
		// prototype defines .__new__(..)...
		constructor.prototype.__new__ instanceof Function ?
			constructor.prototype.__new__(context, ...args)
		// native constructor...
		: /\[native code\]/.test(constructor.toString()) ?
			Reflect.construct(constructor, args)
		// callable instance...
		// NOTE: we need to isolate the callable from instances, thus we
		// 		reference 'constructor' directly rather than using 
		// 		'this.constructor'...
	// XXX autogenerate/set .name ...
		: (typeof(constructor.prototype) == 'function'
				|| constructor.prototype.__call__ instanceof Function) ?
			__toStringProxy(
				function(){
					return (
						// .prototype is a function...
						typeof(constructor.prototype) == 'function' ?
							// NOTE: we are not using .call(..) here as it
							// 		may not be accesible through the prototype
							// 		chain, this can occur when creating a 
							// 		callable instance from a non-callable 
							// 		parent...
							Reflect.apply(
								constructor.prototype, obj, [this, ...arguments])
						// .__call__(..) or fail semi-gracefully...
						: constructor.prototype.__call__
							.call(obj, this, ...arguments)) })
		// recursively call .__rawinstance__(..)
		: constructor.__proto__.__rawinstance__ ?
			constructor.__proto__.__rawinstance__(context, ...args)
		// use parent's constructor...
		: (typeof(constructor.__proto__) == 'function'
				// XXX for some reason if using (function(){}).__proto__ 
				// 		instead of Function.prototype below, coverage is 
				// 		not counted for the condition....
				&& constructor.__proto__ !== Function.prototype) ?
			Reflect.construct(constructor.__proto__, args, constructor)
		// default object base...
		: Reflect.construct(Object, [], constructor)

	// return wrapped object as-is...
	if(obj instanceof module.ASIS){
		return obj.value }

	// link to prototype chain, if not done already...
	obj.__proto__ !== constructor.prototype
		&& (obj.__proto__ = constructor.prototype)

	return obj }


// Make an object constructor function...
//
// 	Make a constructor with an object prototype...
// 		Constructor(name, proto)
// 			-> constructor
//
// 	Make a constructor with a prototype and a constructor prototype...
// 		Constructor(name, constructor-mixin, proto)
// 			-> constructor
//
// 	Make a constructor with prototype extending parent-constructor...
// 		Constructor(name, parent-constructor, proto)
// 		Constructor(name, parent-constructor, constructor-mixin, proto)
// 			-> constructor
//
//
// The resulting constructor can produce objects in one of these ways:
//
// 	Create instance...
// 		constructor(..)
// 		new constructor
// 		new constructor(..)
// 			-> instance
//
//	Create raw/uninitialized instance...
//		constructor.__rawinstance__(..)
//		RawInstance(null, constructor, ..)
//			-> raw-instance
//
//
// All produced objects are instances of the constructor
// 		instance instanceof constructor
// 			-> true
//
//
//
// Create and initialization protocol:
// 	1) raw instance is created:
// 		a) constructor.__rawinstance__(..) / RawInstance(..) called:
// 			- call .__new__(..) if defined and get return value as 
// 				instance, or
// 			- if .__call__(..) defined or prototype is a function, wrap 
// 				it and use the wrapper function as instance, or
// 			- create an empty object
// 		b) instance linked to prototype chain
// 			set .__proto__ to constructor.prototype
// 	2) instance is initialized: 
// 		call .__init__(..) if defined
// 
//
// Special attributes:
//
// 	Sets parent constructor
// 	.__extends__ = constructor
// 		NOTE: this can be set on either constructor-mixin or proto but 
// 			not on both...
// 		NOTE: if .__proto__ is not set in the proto, then it will be 
// 			set to .__extends__.prototype by default.
// 		NOTE: setting this and proto.__proto__ to can be used to link the
// 			constructor and instance object to different prototype chains
// 		NOTE: this attr is only used if explicitly defined, inherited 
// 			values are ignored.
// 		XXX this may get removed in future versions.
//
// 	If true do not link function methods if .__call__(..) is defined
// 	.__skip_call_attrs__ = bool
//
//
// Special methods (constructor):
//
//  Handle uninitialized instance construction
// 	.__rawinstance__(context, ...)
// 		-> instance
// 		NOTE: This is a shorthand to RawInstance(..) see it for 
// 			details.
// 
// 
// Special methods (.prototype):
//
// 	Create new instance object...
// 	.__new__(context, ..)
// 		-> object
//
// 	Handle instance call...
// 	.__call__(context, ..)
// 		-> ..
//
// 	Initialize instance object...
// 	.__init__(..)
// 		-> ..
//
//
// NOTE: raw instance creation is defined by RawInstance(..) so see 
// 		it for more info.
// NOTE: raw instance creation can be completely overloaded by defining
// 		.__rawinstance__(..) on the constructor.
// NOTE: if constructor-mixin's .__proto__ is set it will also be copied
// 		 to the created constructor...
//
//
//
// Inheritance:
// 	A simple way to build C -> B -> A chain would be:
//
// 		// NOTE: new is optional...
// 		var A = new Constructor('A')
//
// 		var B = Constructor('B', A, {})
//
// 		var C = Constructor('C', B, {})
//
// 		var c = C()
//
// 		c instanceof C		// -> true
// 		c instanceof B		// -> true
// 		c instanceof A		// -> true
//
// 		A.prototype.x = 123
//
// 		c.x 				// -> 123
//
//
//
// NOTE: this sets the proto's .constructor attribute, thus rendering it
// 		not reusable, to use the same prototype for multiple objects 
// 		clone it via. Object.create(..) or copy it...
// NOTE: to disable .__rawinstance__(..) handling set it to false in the 
// 		class prototype...
// NOTE: it is currently not possible to mix native unrelated types, for 
// 		example a callable array constructor will produce inconsistent 
// 		instance objects that in general will not work as expected...
// 			Reflect.construct(Array, [], Function)
// 		or
// 			Reflect.construct(Function, [], Array)
// 		will either initialize internal/hidden state for either one or 
// 		the other producing a semi-broken instance.
// 		It is however possible to mix related types as we are doing for 
// 		callable instances (Function + Object -- a function is an object).
// 		See README.md for more info.
// NOTE: making an object callable does not guarantee that it will pass
// 		the instanceof Function test, for that the prototype chain needs
// 		to be rooted in Function.
// 		though the typeof(..) == 'function' will always work.
// NOTE: this will fail with non-identifier names...
// NOTE: a bit more obvious syntax could be something like:
// 			var A = Constructor('A', {
// 				__proto__: B,
//
// 				// constructor stuff...
//
// 				prototype: {
// 					// instance stuff...
// 				}
// 			})
// 		vs:
// 			var A = Constructor('A', B, {
// 				// constructor stuff...
//
// 			}, {
// 				// instance stuff...
// 			})
// 		this though a bit more obvious is in the general case can be 
// 		more verbose, i.e. on the top level we define the constructor 
// 		stuff which in the general case secondary while .prototype is a 
// 		level below that while in use it's the main functionality... so,
// 		this is a question of ease of use vs. mirroring the JS structure,
// 		the answer chosen here is to prioritize simplicity and conciseness
// 		over verbose mirroring...
//		XXX needs revision from time to time...
//		XXX might be a good idea to implement the above syntax and test 
//			it out...
//				Constructor(<name>[, <parent>], <mirror-block>)
//				Constructor(<name>[, <parent>], <prototype-block>)
//				Constructor(<name>[, <parent>], <prototype-block>, <prototype-block>)
//
//				<mirror-block> ::=
//					{
//						...
//
//						prototype: {
//							...
//						},
//					}
//			The only questions here is weather a set .prototype is a good 
//			enough indicator and should we use .__proto__?
var Constructor = 
module.Constructor =
// shorthand...
module.C =
function Constructor(name, a, b, c){
	// sanity check...
	if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name.trim())){
		throw new Error(`Constructor(..): invalid name: "${name}"`) }

	// parse args...
	var args = [...arguments].slice(1, 4)

	// 	Constructor(name[[, constructor[, mixin]], proto])
	var proto = args.pop() || {}
	var constructor_proto = 
		typeof(args[0]) == 'function' ?
			args.shift()
			: undefined
	var constructor_mixin = args.pop()

	/* XXX EXPERIMENTAL...
	// handle: Constructor(name[, constructor], { prototype: { .. }, .. })
	//
	if(proto.hasOwnProperty('prototype') 
			&& proto.prototype){
		console.log('>>>>', name)
		constructor_mixin = proto
		proto = proto.prototype }
	//*/

	// handle: Constructor(name, constructor, ..)
	//
	// NOTE: this is a bit too functional in style by an if-tree would 
	// 		be more bulky and less readable...
	constructor_proto
		// XXX need a better test -- need to test if .__proto__ was set 
		// 		manually and not mess it up...
		&& (proto.__proto__ === Object.prototype
				|| proto.__proto__ === Function.prototype)
			&& (proto.__proto__ = constructor_proto.prototype)
			// restore func .toString(..) that was replaced to object's .toString(..) 
			// in the previous op but only if it was not set by user...
			&& (typeof(proto) == 'function'
					&& proto.toString === Object.prototype.toString)
				// XXX should we wrap this in normalizeIndent(..) ???
				&& (proto.toString = Function.prototype.toString)

	// handle: .__extends__
	if(!constructor_proto){
		// handle .__extends__
		a = Object.hasOwnProperty.call(proto, '__extends__')
				&& proto.__extends__
		b = constructor_mixin != null
				&& Object.hasOwnProperty.call(constructor_mixin, '__extends__')
				&& constructor_mixin.__extends__
		// sanity check...
		if(!!a && !!b){
			throw new Error('Constructor(..): '
				+'only one  of prototype.__extends__ or constructor.__extends__ '
				+'can exist.') }
		constructor_proto = !!a ? a : b
		// cleanup...
		if(!!b){
			constructor_mixin = mixinFlat({}, constructor_mixin)
			delete constructor_mixin.__extends__ }
		!!constructor_proto
			&& (proto.__proto__ = constructor_proto.prototype) }

	// the constructor base... 
	// NOTE: this is ignored by c8 as we will never run this directly as
	// 		it will immediately get eval(..)'ed...
	/* c8 ignore next 9 */
	var _constructor = function Constructor(){
		// create raw instance...
		var obj = _constructor.__rawinstance__ ? 
			_constructor.__rawinstance__(this, ...arguments)
			: RawInstance(this, _constructor, ...arguments)
		// initialize...
		// NOTE: we are using _constructor.prototype.__init__ here instead 
		// 		of obj.__init__ as at this point object may be of a different 
		// 		type (see RawInstance + ASIS)...
		_constructor.prototype.__init__ instanceof Function
			&& _constructor.prototype.__init__.call(obj, ...arguments)
		return obj }
	// rename the consructor...
	// NOTE: we are not using:
	//			Object.defineProperty(_constructor, 'name', { value: name })
	//		because this does not affect the name displayed by the DevTools.
	_constructor = eval('('+ 
		_constructor
			.toString()
			.replace(/Constructor/g, name) +')')

	// set .toString(..)...
	// NOTE: this test is here to enable mixinFlat(..) to overwrite 
	// 		.toString(..) below...
	// 		XXX not sure if this is the correct approach...
	// 		XXX might be a good idea to create a common base class and 
	// 			keep this there...
	;((constructor_mixin || {}).toString === Function.prototype.toString
			|| (constructor_mixin || {}).toString === Object.prototype.toString)
		&& Object.defineProperty(_constructor, 'toString', {
			value: function toString(){ 
				var args = proto.__init__ ?
					proto.__init__
						.toString()
						.split(/\n/)[0]
							.replace(/function\(([^)]*)\){.*/, '$1')
					: ''
				var code = proto.__init__ ?
					proto.__init__
						.toString()
						.replace(/[^{]*{/, '{')
					: '{ .. }'
				return `${this.name}(${args})${doc.normalizeIndent(code)}` },
			enumerable: false,
		})
	// set generic raw instance constructor...
	_constructor.__rawinstance__ instanceof Function
		|| Object.defineProperty(_constructor, '__rawinstance__', {
				value: function __rawinstance__(context, ...args){
					return RawInstance(context, this, ...args) },
				enumerable: false,
			})
	!!constructor_proto
		&& (_constructor.__proto__ = constructor_proto)
	_constructor.prototype = proto
	_constructor.prototype.constructor = _constructor

	// NOTE: this is intentionally last, this enables the user to override
	// 		any of the system methods...
	// NOTE: place the non-overridable definitions after this...
	!!constructor_mixin
		&& mixinFlat(
			_constructor,
			constructor_mixin)
		// also transfer non-default constructor_mixin.__proto__
		&& constructor_mixin.__proto__ !== Object.prototype
			&& (_constructor.__proto__ = constructor_mixin.__proto__)

	// link function stuff for convenience...
	proto.__call__ && !(proto instanceof Function)
		&& _constructor.__skip_call_attrs__ !== true
		&& module.LINK_FUNCTION_METHODS
			.forEach(function(n){
				proto[n] 
					|| Object.defineProperty(proto, n, 
						Object.assign(
							Object.getOwnPropertyDescriptor(Function.prototype, n),
							// NOTE: we can't use Function[n] directly because
							// 		they in general test this for relation to
							// 		function which will fail here...
							{ value: function(){
								return this.__call__[n](this, ...arguments) }, })) })

	return _constructor }


// Complete the constructor...
//
// NOTE: currently this is a complement to the top level functions.
Object.assign(Constructor, {
	sources,
	values,

	parent,
	parentProperty,
	parentCall,

	parentOf,
	childOf,
	related,

	match,
	matchPartial,

	deepKeys,

	create,
})



//---------------------------------------------------------------------
// Mixin utils...

// Mix a set of methods/props/attrs into an object...
// 
//	Mix objects into base...
//	mixinFlat(base, object, ...)
//		-> base
//
//	Soft mix objects into base...
//	mixinFlat('soft', base, object, ...)
//		-> base
//
//
// 'soft' mode only mixies in props if base does not define them already
//
//
// NOTE: essentially this is just like Object.assign(..) but copies 
// 		properties directly rather than copying property values...
// NOTE: this will not transfer several the special variables not listed
// 		by Object.keys(..).
// 		This includes things like .__proto__
// NOTE: this can and will overwrite attributes...
var mixinFlat = 
module.mixinFlat = 
function(base, ...objects){
	var soft = base === 'soft'
	if(soft){
		base = objects.shift() 
		objects = objects
			.slice()
			.reverse() }
	return objects
		.reduce(function(base, cur){
			Object.keys(cur)
				.map(function(k){
					;(!soft || !base.hasOwnProperty(k))
						&& Object.defineProperty(base, k,
							Object.getOwnPropertyDescriptor(cur, k)) })
			return base }, base) }


// Mix sets of methods/props/attrs into an object as prototypes...
//
// 	mixin(base, object, ..)
// 		-> base
//
//
// This will create a new object per set of methods given and 
// mixinFlat(..) the method set into this object leaving the 
// original objects intact.
// 
// 		base <-- object1_copy <-- .. <-- objectN_copy <- base.__proto__
// 				
//
// NOTE: this will only mix in non-empty objects...
// NOTE: mixing into a constructor will break object creation via new...
// 		Example:
// 			class A {}
// 			class B extends A {}
//
// 			mixin(B, {x: 123})
//
// 			var b = new B()			// will break...
//
// 		This does not affect object.Constructor(..) chains...
// NOTE: mixin(Object.prototype, ..) will fail because Object.prototype.__proto__ 
// 		is imutable...
var mixin = 
module.mixin = 
function(base, ...objects){
	base.__proto__ = objects
		.reduce(function(res, cur){
			return Object.keys(cur).length > 0 ?
				module.mixinFlat(Object.create(res), cur) 
				: res }, base.__proto__) 
	return base }


// Get matching mixins...
//
// 	mixins(base, object[, callback])
// 	mixins(base, list[, callback])
// 		-> list
//
//
//	callback(base, obj, parent)
//		-> STOP
//		-> undefined
//
//
// NOTE: this will also match base...
// NOTE: if base matches directly callback(..) will get undefined as parent
// NOTE: for more docs on the callback(..) see sources(..)
//
// XXX should this be a generator???
var mixins =
module.mixins =
function(base, object, callback){
	object = object instanceof Array ?
		object
		: [object]
	var res = []
	var o
	var parent
	while(base != null){
		// match each object...
		for(var obj of object){
			if(match(base, obj)){
				o = callback 
					&& callback(base, obj, parent)
				// manage results...
				res.push(
					(o === undefined || o === module.STOP) ? 
						[base]
					: o instanceof module.STOP ?
						o.value
					: o )
				if(o === module.STOP 
						|| o instanceof module.STOP){
					return res.flat() } 
				// match found, no need to test further...
				break } }
		parent = base
		base = base.__proto__ }
	return res.flat() }


// Check of base has mixin...
//
// 	hasMixin(base, mixin)
// 		-> bool
//
//
// NOTE: to test for a flat mixin directly use .matchPartial(base, object)
var hasMixin =
module.hasMixin =
function(base, object){
	return (
		// normal mixin...
		mixins(base, object, function(){ return module.STOP })
			.length > 0
		// flat mixin search...
		|| [...sources(base)]
			.some(function(p){ 
				return matchPartial(p, object) }) )}


// Mix-out sets of methods/props/attrs out of an object prototype chain...
//
// 	Mix-out first occurrence of each matching object...
// 	mixout(base, object, ..)
// 	mixout(base, 'first', object, ..)
// 		-> base
//
// 	Mix-out all occurrences of each matching object...
// 	mixout(base, 'all', object, ..)
// 		-> base
//
//
// NOTE: this is the opposite to mixin(..)
// NOTE: this used mixins(..) / match(..) to find the relevant mixins, 
// 		see those for more info...
var mixout =
module.mixout =
function(base, ...objects){
	var all = objects[0] == 'all' ?
			!!objects.shift()
		: objects[0] == 'first' ?
			!objects.shift()
		: false
	var remove = []
	mixins(base, objects, function(match, obj, parent){
		parent && remove.push(parent)
		// when removing the first occurrence, don't check for obj again...
		all || objects.splice(objects.indexOf(obj), 1) })
	// NOTE: we are removing on a separate stage so as not to mess with
	// 		mixins(..) iterating...
	remove
		// XXX not sure why this is needed, needs thought...
		.reverse()
		.forEach(function(p){
			p.__proto__ = p.__proto__.__proto__ })
	return base }


// Mixin wrapper/object...
//
//	Create a new mixin...
//	Mixin(name, proto, ..)
//		-> mixin
//
//	Create a new mixin setting the default mode...
//	Mixin(name, mode, proto, ..)
//		-> mixin
//
//
//	Apply mixin in the prototype chain (default)...
//	mixin(obj)
//	mixin('proto', obj)
//		-> obj
//
//	Copy date from mixin into obj directly...
//	mixin('flat', obj)
//		-> obj
//
//
//
// Example:
//
// 		var BasicMixin = Mixin('BasicMixin', {
// 			...
// 		})
//
// 		...
//
//		var o = {
//			...
//		}
//
//		BasicMixin(o)
//
//
// NOTE: the constructor will allways create a new .proto object but will 
// 		not do a deep copy into it -- see mixin(..) / mixinFlat(..)
//
// XXX should this move to its own modue???
var Mixin =
module.Mixin =
Constructor('Mixin', {
	// static methods...
	//
	// NOTE: currently this is a complement to the top level functions.
	mixin,
	mixinFlat,
	mixout,

	mixins,
	hasMixin,

}, {
	name: null,

	// mixin proto...
	proto: null,

	// proto "copy" mode...
	//
	// This can be:
	// 	'proto'		- mix proto into prototype chain (default)
	// 	'flat'		- use mixinFlat(..) to copy proto
	// 	'soft'	- like 'flat' but uses mixinFlat('soft', ..)
	mode: 'proto',

	// base API...
	//
	isMixed: function(target){
		return this.constructor.hasMixin(target, this.proto) },
	mixout: function(target){
		return this.constructor.mixout(target, this.proto) },

	// mix into target...
	__call__: function(_, target, mode=this.mode){
		typeof(target) == typeof('str')
			&& ([_, mode, target] = arguments)
		return mode == 'flat' ?
				this.constructor.mixinFlat(target, this.proto)
			: mode == 'soft' ?
				this.constructor.mixinFlat('soft', target, this.proto)
			: this.constructor.mixin(target, this.proto) },

	__init__: function(name, ...proto){
		// Mixin(name, mode, ...) -- handle default mode...
		typeof(proto[0]) == typeof('str')
			&& (this.mode = proto.shift())
		// name...
		// NOTE: .defineProperty(..) is used because this is a function
		// 		and function's .name is not too configurable...
		// NOTE: we do not need to configure this any more, .defineProperty(..)
		// 		merges the descriptor into the original keeping any values not
		// 		explicitly overwritten...
		// XXX is this effective???
		// 		...will this show up in DevTools???
		Object.defineProperty(this, 'name', { value: name })
		// create/merge .proto...
		this.proto = this.constructor.mixinFlat({}, 
			...proto.map(function(e){ 
				// handle bare objects and mixins differently...
				return e instanceof Mixin ? 
					e.proto 
					: e })) },
})



//---------------------------------------------------------------------

BOOTSTRAP()




/**********************************************************************
* vim:set ts=4 sw=4 nowrap :                        */ return module })
