/**********************************************************************
* 
*
*
* XXX should this extend Object???
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)(
function(require){ var module={} // makes module AMD/node compatible...
/*********************************************************************/
// Helpers...

var TAB_SIZE =
module.TAB_SIZE = 4


// Normalize indent...
//
// 	normalizeIndent(text)
// 		-> text
//
// This will remove common indent from each like of text, this is useful 
// for printing function code of functions that were defined at deep levels 
// of indent.
//
// NOTE: this will trim out both leading and trailing whitespace.
//
// XXX is this the right place for this???
// 		...when moving take care that ImageGrid's core.doc uses this...
var normalizeIndent =
module.normalizeIndent =
function(text, tab_size){
	tab_size = tab_size || TAB_SIZE
	text = tab_size > 0 ?
		text.replace(/\t/g, ' '.repeat(tab_size))
		: text
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
			return i == 0 ? 
				line 
				: line.slice(l) })
		.join('\n')
		.trim() }



//---------------------------------------------------------------------

// Get a list of sources/definitions for a prop/attr...
//
// 	sources(obj, name)
// 	sources(obj, name, callback)
// 		-> list
//
//
// XXX should the callback(..) be used to break (current) or filter/map???
// XXX revise name...
var sources =
module.sources =
function(obj, name, callback){
	var stop
	var res = []
	do {
		if(obj.hasOwnProperty(name)){
			res.push(obj)
			// handle callback...
			stop = callback
				&& callback(obj)
			// stop requested by callback...
			if(stop === false || stop == 'stop'){
				return obj } }
		obj = obj.__proto__
	} while(obj !== null)
	return res }


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
// Make/get the base instance object...
//
// 	makeRawInstance(context, constructor, ...args)
// 		-> instance
//
//
// This will:
// 	- construct an object
// 		- if .__new__(..) is defined
// 			-> call and use its return value
//		- if prototype is a function or if .__call__(..) is defined
//			-> use a wrapper function
//		- else
//			-> use {}
// 	- link the object into the prototype chain
//
//
// This will not call .__init__(..)
//
// XXX Q: should this be a class method or a utility???
// XXX Q: should .__new__(..) be a class method???
var makeRawInstance = 
module.makeRawInstance =
function(context, constructor, ...args){
	var _mirror_doc = 
	function(func, target){
		Object.defineProperty(func, 'toString', {
			value: function(...args){
				return target.toString(...args) },
			enumerable: false,
		})
		return func }

	var obj =
		// prototype defines .__new__(..)...
		constructor.prototype.__new__ instanceof Function ?
			constructor.prototype.__new__(context, ...args)
		// callable instance -- prototype is a function...
		// NOTE: we need to isolate the .prototype from instances...
		: constructor.prototype instanceof Function ?
			_mirror_doc(
				function(){
					return constructor.prototype.call(obj, this, ...arguments) },
				constructor.prototype)
		// callable instance -- prototype defines .__call__(..)...
		// NOTE: we need to isolate the .__call__ from instances...
		: constructor.prototype.__call__ instanceof Function ?
			_mirror_doc(
				function(){
					return constructor.prototype.__call__.call(obj, this, ...arguments) },
				constructor.prototype.__call__)
		// default object base...
		: {} 

	// link to prototype chain...
	obj.__proto__ = constructor.prototype
	Object.defineProperty(obj, 'constructor', {
		value: constructor,
		enumerable: false,
	})

	return obj }


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Make a JavaScrip object constructor...	
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
// XXX Q: should the context in .__new__(..) be _constructor or .prototype???
// 		...currently it's .prototype...
// XXX Q: should we add a wrapper to .makeRawInstance(..) as a class method here???
var Constructor = 
module.Constructor =
// shorthand...
module.C =
function Constructor(name, a, b){
	var proto = b == null ? a : b
	var cls_proto = b == null ? b : a
	proto = proto || {}

	// XXX EXPERIMENTAL...
	var _rawinstance = function(){
		return (_constructor.__proto__ || {}).__rawinstance__ ?
			_constructor.__proto__.__rawinstance__.call(this, ...arguments)
			: makeRawInstance(this, _constructor, ...arguments) }

	// the actual constructor...
	var _constructor = function Constructor(){
		var obj = _rawinstance.call(this, ...arguments)
		obj.__init__ instanceof Function
			&& obj.__init__(...arguments)
		return obj }

	_constructor.name = name
	// just in case the browser refuses to change the name, we'll make
	// it a different offer ;)
	_constructor.name == 'Constructor'
		// NOTE: this eval(..) should not be a risk as its inputs are
		// 		static and never infuenced by external inputs...
		&& eval('_constructor = '+ _constructor
				.toString()
				.replace(/Constructor/g, name))
	// set .toString(..)...
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
				return `${this.name}(${args})${normalizeIndent(code)}` },
			enumerable: false,
		})
	_constructor.__proto__ = cls_proto
	_constructor.prototype = proto
	_constructor.__rawinstance__ = _rawinstance 

	// set .prototype.constructor
	Object.defineProperty(_constructor.prototype, 'constructor', {
		value: _constructor,
		enumerable: false,
	})

	return _constructor
}



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
