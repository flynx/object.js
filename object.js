/**********************************************************************
* 
* object.js
*
* Repo and docs:
* 	https://github.com/flynx/object.js
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/
// Helpers...

var TAB_SIZE =
module.TAB_SIZE = 4

var KEEP_TABS = 
module.KEEP_TABS = 1


// Normalize code indent...
//
// 	normalizeIndent(text)
// 		-> text
//
//
// This will remove common indent from each like of text, this is useful 
// for printing function code of functions that were defined at deep 
// levels of indent.
//
// This will ignore the indent of the first line.
//
// If the last line is indented higher or equal to the rest of the text 
// we will user keep_tabs (defaults to KEEP_TABS) to indent the rest of 
// the text.
// This will indent the following styles correctnly:
//
// 		|function(a, b){				|function(a, b){
// 		|	return a + b }				|	return a + b
// 		|								|}
//
// NOTE: this will trim out both leading and trailing white-space.
//
// XXX is this the right place for this???
// 		...when moving take care that ImageGrid's core.doc uses this...
var normalizeIndent =
module.normalizeIndent =
function(text, tab_size, keep_tabs){
	tab_size = tab_size == null ? 
		TAB_SIZE 
		: tab_size
	keep_tabs = (keep_tabs == null ? 
			KEEP_TABS 
			: keep_tabs) 
		* tab_size
	// prepare text...
	var tab = ' '.repeat(tab_size)
	text = tab != '' ?
		text.replace(/\t/g, tab)
		: text
	var lines = text.trim().split(/\n/)
	// count common indent...
	var l = lines 
		.reduce(function(l, e, i){
			var indent = e.length - e.trimLeft().length
			return e.trim().length == 0 
						// ignore 0 indent of first line...
						|| (i == 0 && indent == 0) ?
					l 
				// last line -- ignore keep_tabs if lower indent...
				: i == lines.length-1 && indent > l ? 
					Math.max(l-keep_tabs, 0) 
				// initial state...
				: l < 0 ? 
					indent 
				// min...
				: Math.min(l, indent) }, -1)
	// normalize...
	return lines
		.map(function(line, i){ 
			return i == 0 ? 
				line 
				: line.slice(l) })
		.join('\n')
		.trim() }


// shorthand more suted for text...
var normalizeTextIndent =
module.normalizeTextIndent =
function(text, tab_size, keep_tabs){
	return module.normalizeIndent(text, tab_size, keep_tabs || 0) }


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
var match = 
module.match =
function(base, obj){
	// identity...
	if(base === obj){
		return true }
	// typeof -- sanity check...
	if(typeof(base) != typeof(obj)){
		return false }
	// attr count...
	var o = Object.keys(Object.getOwnPropertyDescriptors(obj))
	if(Object.keys(Object.getOwnPropertyDescriptors(base)).length != o.length){
		return false }
	// names and values...
	o = o.map(function(k){
			return [k, obj[k]] })
	while(o.length > 0){
		var [k, v] = o.pop()
		if(!base.hasOwnProperty(k) || base[k] !== v){
			return false } }
	return true }



//---------------------------------------------------------------------
// Prototype chain content access...

// Get a list of source objects for a prop/attr name...
//
// 	sources(obj, name)
// 	sources(obj, name, callback)
// 		-> list
// 		-> []
// 		
// 	callback(obj)
// 		-> true | 'stop'
// 		-> ..
// 		
// 		
// The callback(..) is called with each matching object.
// 
// The callback(..) can be used to break/stop the search, returning 
// a partial list og matcges up untill and including the object 
// triggering the stop.
//
//
// NOTE: this go up the prototype chain, not caring about any role (
// 		instance/class or instance/prototype) bounderies and depends 
// 		only on the object given as the starting point.
// 		It is possible to start the search from this, thus checking
// 		for any overloading in the instance, though this approach is 
// 		not very reusable....
// NOTE: this will not trigger any props...
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
			if(stop === true || stop == 'stop'){
				return res } 
		}
		obj = obj.__proto__
	} while(obj !== null)
	return res }


// Find the next parent attribute in the prototype chain.
//
// 	Get parent attribute value...
// 	parent(proto, name)
// 		-> value
// 		-> undefined
//
// 	Get parent method...
// 	parent(method, this)
// 		-> meth
// 		-> undefined
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
var parent =
module.parent =
function(proto, name){
	// special case: method...
	if(typeof(name) != typeof('str')){
		that = name
		name = proto.name
		// get first matching source...
		proto = sources(that, name, 
				function(obj){ return obj[name] === proto })
			.pop() }
	// get first source...
	var res = sources(proto, name, 
			function(obj){ return 'stop' })
		.pop() 
	return res ?
		// get next value...
		res.__proto__[name] 
		: undefined }


// Find the next parent property descriptor in the prototype chain...
//
// 	parentProperty(proto, name)
// 		-> prop-descriptor
//
//
// This is like parent(..) but will get a property descriptor...
//
var parentProperty =
module.parentProperty =
function(proto, name){
	// get second source...
	var c = 0
	var res = sources(proto, name, 
			function(obj){ return c++ == 1 })
		.pop() 
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
	return meth instanceof Function ?
		meth.call(...( typeof(name) == typeof('str') ?
			[...arguments].slice(2)
			: [...arguments].slice(1) ))
		: undefined }



//---------------------------------------------------------------------
// Mixin utils...

// Mix a set of methods/props/attrs into an object...
// 
//	mixinFlat(base, object, ...)
//		-> base
//
//
// NOTE: essentially this is just like Object.assign(..) but copies 
// 		properties directly rather than copying property values...
var mixinFlat = 
module.mixinFlat = 
function(base, ...objects){
	return objects
		.reduce(function(base, cur){
			Object.keys(cur)
				.map(function(k){
					Object.defineProperty(base, k,
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
//		-> 'stop' | false
//		-> undefined
//
//
// NOTE: if base matches directly callback(..) will get undefined as parent
// NOTE: this will also match base...
var mixins =
module.mixins =
function(base, object, callback){
	object = object instanceof Array ?
		object
		: [object]
	var res = []
	var stop
	var parent
	while(base != null){
		// match each object...
		for(var obj of object){
			if(match(base, obj)){
				res.push(base)
				stop = callback 
					&& callback(base, obj, parent)
				if(stop === true || stop == 'stop'){
					return res } 
				// match found, no need to test further...
				break } }
		parent = base
		base = base.__proto__ }
	return res }


// Check of base has mixin...
//
// 	hasMixin(base, mixin)
// 		-> bool
//
var hasMixin =
module.hasMixin =
function(base, object){
	return mixins(base, object, function(){ return 'stop' }).length > 0 }


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



//---------------------------------------------------------------------
// Constructor...

// Make an uninitialized instance object...
//
// 	makeRawInstance(context, constructor, ...)
// 		-> instance
//
//
// This will:
// 	- construct an object
// 		- if .__new__(..) is defined
// 			-> call and use its return value
//		- if prototype is a function or if .__call__(..) is defined
//			-> use a wrapper function
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
// 			var l = new makeRawInstance(null, Array, 'a', 'b', 'c')
// NOTE: the following are not the same in structure but functionally 
// 		are identical:
// 			var C = Constructor('C', function(){ .. })
// 		and
// 			var C2 = Constructor('C2', { __call__: function(){ .. } })
// 		the difference is in C.prototype vs. C2.prototype, the first 
// 		being a function while the second is an object with a call 
// 		method...
var makeRawInstance = 
module.makeRawInstance =
function(context, constructor, ...args){
	var _mirror_doc = function(func, target){
		Object.defineProperty(func, 'toString', {
			value: function(...args){
				var f = target.prototype instanceof Function ?
					target.prototype
					: target.prototype.__call__
				return f instanceof Function ?
						module.normalizeIndent(f.toString(...args))
					: undefined },
			enumerable: false,
		})
		return func }

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
		: (constructor.prototype instanceof Function
				|| constructor.prototype.__call__ instanceof Function) ?
			_mirror_doc(
				function(){
					return (
						// .prototype is a function...
						constructor.prototype instanceof Function ?
							constructor.prototype
								.call(obj, this, ...arguments)
						// .__call__(..)
						: constructor.prototype.__call__
							.call(obj, this, ...arguments)) },
				constructor)
		// use parent's constructor...
		// XXX do a better test???
		: (constructor.__proto__ instanceof Function 
				&& constructor.__proto__ !== (function(){}).__proto__) ?
			Reflect.construct(constructor.__proto__, [], constructor)
		// default object base...
		: Reflect.construct(Object, [], constructor)

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
//		makeRawInstance(null, constructor, ..)
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
// 		a) constructor.__rawinstance__(..) / makeRawInstance(..) called:
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
//
// Special methods (constructor):
//
//  Handle uninitialized instance construction
// 	.__rawinstance__(context, ...)
// 		-> instance
// 		NOTE: This is a shorthand to makeRawInstance(..) see it for 
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
// NOTE: raw instance creation is defined by makeRawInstance(..) so see 
// 		it for more info.
// NOTE: raw instance creation can be completely overloaded by defining
// 		.__rawinstance__(..) on the constructor.
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
var Constructor = 
module.Constructor =
// shorthand...
module.C =
function Constructor(name, a, b, c){
	var args = [...arguments].slice(1, 4)

	// parse args...
	// 	Constructor(name[[, constructor[, mixin]], proto])
	var proto = args.pop() || {}
	var constructor_proto = args[0] instanceof Function ?
		args.shift()
		: undefined
	var constructor_mixin = args.pop()

	// handle: 
	// 	Constructor(name, constructor, ..)
	constructor_proto
		&& proto.__proto__ === Object.prototype
		&& (proto.__proto__ = constructor_proto.prototype)

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
			&& (proto.__proto__ = constructor_proto.prototype)
	}


	// the constructor base...
	var _constructor = function Constructor(){
		// create raw instance...
		var obj = _constructor.__rawinstance__ ? 
				_constructor.__rawinstance__(this, ...arguments)
			: makeRawInstance(this, _constructor, ...arguments)
		// initialize...
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
	// XXX revise this test...
	;((constructor_mixin || {}).toString === Function.toString
			|| (constructor_mixin || {}).toString === ({}).toString)
		&& Object.defineProperty(_constructor, 'toString', {
			value: function(){ 
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
				return `${this.name}(${args})${module.normalizeIndent(code)}` },
			enumerable: false,
		})
	// set generic raw instance constructor...
	_constructor.__rawinstance__ instanceof Function
		|| (_constructor.__rawinstance__ = 
			function(context, ...args){
				return makeRawInstance(context, this, ...args) })
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

	return _constructor }




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
