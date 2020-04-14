/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)(
function(require){ var module={} // makes module AMD/node compatible...
/*********************************************************************/



/*********************************************************************/
// Helpers...

// XXX is this the right place for this???
// 		...when moving take care that ImageGrid's core.doc uses this...
var normalizeIndent =
module.normalizeIndent =
function(text){
	var lines = text.split(/\n/)
	var l = lines 
		.reduce(function(l, e, i){
			var indent = e.length - e.trimLeft().length
			return e.trim().length == 0 
					// ignore 0 indent of first line...
					|| (i == 0 && indent == 0) ? l 
				: l < 0 ? 
					indent 
				: Math.min(l, indent)
		}, -1)
	return lines
		.map(function(line, i){ 
			return i == 0 ? line : line.slice(l) })
		.join('\n') }



//---------------------------------------------------------------------

// Find the next parent method in the prototype chain.
//
// 	parent(meth, this)
// 	parent(meth, name, this)
// 		-> meth
//
//
// NOTE: there are cases where method.name is not set, so a name can be 
// 		passed explicitly.
// NOTE: this is super(..) replacement...
// NOTE: if method is root (no super method) this will return undefined.
var parent = 
module.parent =
function(method, name, that){
	if(arguments.length == 2){
		that = name
		name = method.name
	}
	// find the current method in the prototype chain...
	while(!that.hasOwnProperty(name) || that[name] !== method){
		that = that.__proto__
	}
	// return the next method...
	return that.__proto__[name] }


// Get a list of prototypes that have a prop/attr defined ...
//
// 	defines(obj, name)
// 	defines(obj, name, callback)
// 		-> list
//
// XXX revise name...
var defines =
module.defines =
function(that, name, callback){
	var stop
	var res = []
	do {
		if(that.hasOwnProperty(name)){
			res.push(that)
			// handle callback...
			stop = callback
				&& callback(that)
			// stop requested by callback...
			if(stop === false || stop == 'stop'){
				return that } }
		that = that.__proto__
	} while(that !== null)
	return res }



//---------------------------------------------------------------------

// Mix a set of methods/props/attrs into an object...
// 
//	mixinFlat(root, object, ...)
//		-> root
//
//
// NOTE: essentially this is just like Object.assign(..) but copies 
// 		properties directly rather than copying property values...
var mixinFlat = 
module.mixinFlat = 
function(root, ...objects){
	return objects
		.reduce(function(root, cur){
			Object.keys(cur)
				.map(function(k){
					Object.defineProperty(root, k,
						Object.getOwnPropertyDescriptor(cur, k)) })
			return root }, root) }


// Mix sets of methods/props/attrs into an object as prototypes...
//
// 	mixin(root, object, ...)
// 		-> root
//
//
// This will create a new object per set of methods given and 
// mixinFlat(..) the method set into this object leaving the 
// original objects intact.
// 
// 		root <-- object1_copy <-- .. <-- objectN_copy
// 				
var mixin = 
module.mixin = 
function(root, ...objects){
	return objects
		.reduce(function(res, cur){
			return module.mixinFlat(Object.create(res), cur) }, root) }



//---------------------------------------------------------------------
// Make a JavaScrip object constructor...	
//
//
// 	Make a constructor with an object prototype...
// 		Constructor(<name>, <proto>)
// 			-> constructor
//
// 	Make a constructor with a prototype (object/function) and a class
// 	prototype...
// 		Constructor(<name>, <class-proto>, <proto>)
// 			-> constructor
// 			NOTE: the <class-proto> defines a set of class methods and 
// 					attributes.
//
//
//
// The resulting constructor can produce objects in one of these ways:
//
// 	Basic constructor use...
// 		constructor()
// 		new constructor
// 		new constructor()
// 			-> instance
//
// 	Pass arguments to the constructor...
// 		constructor(<arg>[, ...])
// 		new constructor(<arg>[, ...])
// 			-> instance
//
//
// All produced objects are instances of the constructor
// 		instance instanceof constructor
// 			-> true
//
//
//
// Init protocol:
// 	1) the base instance object is created 
// 	2) if .__new__(..) is defined it is passed to it along with the 
// 		constructor arguments and the return value is used as base instance.
// 		NOTE: .__new__(..) is called in the context of the constructor 
// 			.prototype...
// 	2) the base instance object is prepared (.__proto__ is set)
// 	3) if <init-func> is present, then it is called with instance as 
// 		context and passed the constructor arguments
// 	4) if <proto>.__init__(..) is present, it is called with the instance
// 		as context and passed the constructor arguments.
//
//
//
// Inheritance:
// 	A simple way to build C -> B -> A chain would be:
//
// 		// NOTE: new is optional...
// 		var A = new Constructor('A', {})
//
// 		// NOTE: the prototype is an instance and not a constructor,
// 		//		this is obvious if one considers that in JS there are
// 		//		no classes and inheritance is done via object prototypes
// 		//		but this might be a gotcha to people coming from the 
// 		//		class-object world.
// 		// NOTE: we are creating instances here to provide isolation 
// 		//		between A and B prototypes...
// 		//		two other ways to do this would be:
// 		//			Object.create(A.prototype)
// 		//		or:
// 		//			{__proto__: A.prototype}
// 		var B = Constructor('B', A())
//
// 		var C = Constructor('C', {__proto__: B.prototype})
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
// Motivation:
// 	The general motivation here is to standardise the constructor protocol
// 	and make a single simple way to go with minimal variation. This is due
// 	to the JavaScript base protocol though quite simple, being too flexible
// 	making it very involved to produce objects in a consistent manner by 
// 	hand, especially in long running projects, in turn spreading all the 
// 	refactoring over multiple sites and styles.
//
// 	This removes part of the flexibility and in return gives us:
// 		- single, well defined protocol
// 		- one single spot where all the "magic" happens
// 		- full support for existing JavaScript ways of doing things
// 		- easy refactoring without touching the client code
//
//
// NOTE: this sets the proto's .constructor attribute, this rendering it
// 		not reusable, to use the same prototype for multiple objects clone
// 		it via. Object.create(..) or copy it...
//
// XXX might be a good idea to be able to make an instance without 
// 		initializing it...
// 		...mainly for inheritance.
// 		...would also be helpful in this case to call all the 
// 		constructors in the chain
// XXX need a simple way to make a function constructor...
var Constructor = 
module.Constructor =
// shorthand...
module.C =
function Constructor(name, a, b){
	var proto = b == null ? a : b
	var cls_proto = b == null ? b : a

	// mirror doc from target to func...
	var _mirror = function(func, target){
		Object.defineProperty(func, 'toString', {
			value: function(...args){
				return target.toString(...args) },
			enumerable: false,
		})
		return func }

	var __new__ = function(base, ...args){

	}

	var _constructor = function Constructor(){
		// NOTE: the following does the job of the 'new' operator but
		// 		with one advantage, we can now pass arbitrary args 
		// 		in...
		// 		This is equivalent to:
		//			return new _constructor(json)
		var obj = 
			// prototype defines .__new__(..)...
			_constructor.prototype.__new__ instanceof Function ?
				_constructor.prototype.__new__(this, ...arguments)
			// prototype is a function...
			// NOTE: we need to isolate the .prototype from instances...
			: _constructor.prototype instanceof Function ?
				_mirror(
					function(){
						return _constructor.prototype.call(obj, this, ...arguments) },
					_constructor.prototype)
			// prototype defines .__call__(..)...
			// NOTE: we need to isolate the .__call__ from instances...
			: _constructor.prototype.__call__ instanceof Function ?
				_mirror(
					function(){
						return _constructor.prototype.__call__.call(obj, this, ...arguments) },
					_constructor.prototype.__call__)
			// default object base...
			: {}

		obj.__proto__ = _constructor.prototype
		Object.defineProperty(obj, 'constructor', {
			value: _constructor,
			enumerable: false,
		})

		// load initial state...
		obj.__init__ instanceof Function
			&& obj.__init__(...arguments)

		return obj
	}

	// just in case the browser refuses to change the name, we'll make it
	// a different offer ;)
	_constructor.name == 'Constructor'
		&& eval('_constructor = '+ _constructor
				.toString()
				.replace(/Constructor/g, name))

	// set an informative Constructor .toString(..)...
	// NOTE: do this only if .toString(..) is not defined by user...
	;((cls_proto || {}).toString() == ({}).toString())
		// XXX is this the right way to go or should we set this openly???
		&& Object.defineProperty(_constructor, 'toString', {
			value: function(){ 
				var args = proto.__init__ ?
					proto.__init__
						.toString()
						.split(/\n/)[0].replace(/function\(([^)]*)\){.*/, '$1')
					: ''
				var code = proto.__init__ ?
					proto.__init__
						.toString()
						.replace(/[^{]*{/, '{')
					: '{ .. }'

				return `${this.name}(${args})${normalizeIndent(code)}`
			},
			enumerable: false,
		})

	_constructor.__proto__ = cls_proto
	_constructor.prototype = proto
	Object.defineProperty(_constructor.prototype, 'constructor', {
		value: _constructor,
		enumerable: false,
	})

	return _constructor
}




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
