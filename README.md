# object.js

_object.js_ provides a meta-constructor and a set of tools and utilities 
to aid in object/instance construction and implementing dynamic data and 
functionality inheritance within the established JavaScript prototypical
object model and interfaces.


This is an alternative to the ES6 `class` syntax in JavaScript and provides 
several advantages:  
- Simple way to define instance and constructor methods, properties and 
  attributes,
- Uniform and minimalistic definition syntax based on basic JavaScript 
  object syntax, no special cases, special syntax or _"the same but slightly 
  different"_ ways to do things,
- _Transparently_ based on JavaScript's prototypical inheritance model,
- Granular instance construction (a-la _Python's_ `.__new__(..)` 
  and `.__init__(..)` methods),
- Simple way to define callable instances (including a-la _Python's_ 
  `.__call__(..)`),
- Produces fully introspectable constructors/instances, i.e. no _direct_
  way to define "private" attributes or methods,
- Does not try to emulate constructs not present in the language (classes),
- Less restrictive:
	- `new` is optional,
	- all input components are reusable,
	- no artificial restrictions.

Disadvantages compared to the `class` syntax:  
- No _syntactic sugar_,
- Slightly more complicated calling of `parent` (_super_) methods.


Note that the produced constructors and objects are functionally 
identical (almost) to the ones produced via ES6 classes and are 
interchangeable with them.


Here is a basic comparison:
<table border="0">
<tr valign="top">
<td width="50%">

_object.js_
```javascript
var A = object.Constructor('A', {
	// prototype attribute (inherited)...
	attr: 'prototype',

	method: function(){
		// ...
	},
})

var B = object.Constructor('B', A, {
	constructor_attr: 'constructor',

	constructor_method: function(){
		return 'constructor'
	},
}, {
	get prop(){
		return 42 },

	__init__: function(){
		this.instance_attr = 7
	},
})
```

- Clear separation of constructor and `.prototype` data:
	- First block (optional) is merged with `B`,
	- Second block _is_ the `B.prototype`,
- No _direct_ way to do "private" definitions,
- No special syntax, less distinct.

</td>
<td>

_ES6_
```javascript
class A {
	// instance attribute (copied)...
	attr = 'instance'

	method(){
		// ...
	}
}

class B extends A {
	static constructor_attr = 'class'

	static constructor_method(){
		return 'class'
	}

	get prop(){
		return 42 }

	constructor(){
		super(...arguments)	

		this.instance_attr = 7
	}
}
```
- Syntax pretty but _misleading_;  
  calling a constructor a class is not correct,
- `static` and instance definitions are not ordered,
- `.attr` is copied to every instance

</td>
</tr>
</table>



## Contents
- [object.js](#objectjs)
	- [Contents](#contents)
	- [Installation](#installation)
	- [Basic usage](#basic-usage)
		- [Inheritance](#inheritance)
		- [Callable instances](#callable-instances)
		- [Mix-ins](#mix-ins)
	- [Advanced usage](#advanced-usage)
		- [Low level constructor](#low-level-constructor)
		- [Extending the constructor](#extending-the-constructor)
		- [Inheriting from native constructor objects](#inheriting-from-native-constructor-objects)
		- [Extending native `.constructor(..)`](#extending-native-constructor)
	- [Components](#components)
	- [Utilities](#utilities)
	- [Limitations](#limitations)
		- [Can not mix unrelated native types](#can-not-mix-unrelated-native-types)
	- [License](#license)


## Installation

```shell
$ npm install ig-object

```

Or just download and drop [object.js](object.js) into your code.



## Basic usage

Include the code, this is compatible with both [node's](https://nodejs.org/) and
[RequireJS'](https://requirejs.org/) `require(..)`
```javascript
var object = require('ig-object')
```

Create a basic constructor...

```javascript
// NOTE: new is optional here...
var A = new object.Constructor('A')

var B = object.Constructor('B', A, {})

var C = object.Constructor('C', B, {})
```

Now we can test this...
```javascript
var c = C() // or new C()

c instanceof C // -> true
c instanceof B // -> true
c instanceof A // -> true
```


### Inheritance
```javascript
//
//	  Base <--- Item
//
var Base = object.Constructor('Base', {
	proto_attr: 'prototype attr value',

	get prop(){
		return 'propery value' },

	method: function(){
		console.log('Base.method()') },

	// initializer...
	__init__: function(){
		this.instance_attr = 'instance'
	},
})

var Item = object.Constructor('Item', Base, {
	__init__: function(){
		// call the "super" method...
		object.parentCall(this.prototype.__init__, this)

		this.item_attr = 'instance attribute value'
	},
})

var SubItem = object.Constructor('SubItem', Item, {
	// ...
})
```


### Callable instances

```javascript
var Action = object.Constructor('Action',
	// constructor as a function...
	function(context, ...args){
		// return the instance...
		return this
	})

var action = new Action()

// the instance now is a function...
action()


// a different way to do the above...
//
// This is the same as the above but a bit more convenient as we do 
// not need to use Object.assign(..) or object.mixinFlat(..) to define
// attributes and props.

var Action2 = object.Constructor('Action2', {
	__call__: function(context, ...args){
		return this
	},
})

```

In the above cases both the _function constructor_ and the `.__call__(..)` 
method receive a `context` argument in addition to `this` context, those 
represent the two contexts relevant to the callable instance:
- Internal context (`this`)  
  This always references the instance being called
- External context (`context`)	
  This is the object the instance is called from, i.e. the call _context_ 
  (`window` or `global` by default)

If the prototype is explicitly defined as a function then it is the 
user's responsibility to call `.__call__(..)` method.


**Notes:**
- the two approaches (_function_ vs. `.__call__(..)`) will produce 
  slightly different results, the difference is in `.prototype`, in the
  first case it is a _function_ while in the second an object with a 
  `.__call__(..)` method.  
  (this may change in the future)


### Mix-ins

Prototype-based mixin...
```javascript

var utilityMixin = {
	utility: function(){
		// ...
	},
}

var Base = object.Constructor('Base') 


// mixin directly into the instance...
var m = object.mixin(Base(), utilityMixin)
```

`.mixin(..)` will copy the contents of `utilityMixin` into the prototype 
chain between `m` and `m.__proto__`.

We can also remove the mixin...
```javascript
m = o.mixout(m, utilityMixin)
```

The mixed-in data is removed iff an object is found in the chain with the
same attributes as `utilityMixin` and with each attribute matching
identity with the corresponding attribute in the mixin.


Constructor-based mixin...
```javascript
var UtilityMixin = function(parent){
	return object.Constructor(parent.name + '+utils', parent, utilityMixin) }

var Mixed = object.Constructor('Mixed', UtilityMixin(Base), {
	// ...
})

var m = Mixed()
```


## Advanced usage

### Low level constructor

```javascript
var LowLevel = object.Constructor('LowLevel', {
	__new__: function(context, ...args){
		return {}
	},
})

```

Like _function constructor_ and `.__call__(..)` this also has two contexts,
but the internal context is different -- as it is the job of `.__new__(..)`
to create an instance, at time of call the instance does not exist and `this`
references the `.prototype` object.
The external context is the same as above.

Contexts:
- Internal context (`this`)  
  References the `.prototype` of the constructor.
- External context (`context`)	
  This is the object the instance is called from, i.e. the call _context_ 
  (`window` or `global` by default), the same as for function constructor 
  and `.__call__(..)`.
 

The value `.__new__(..)`returns is used as the instance and gets linked 
in the prototype chain.

This has priority over the callable protocols above, thus the user must
take care of both the _function constructor_ and `prototype.__call__(..)` 
handling.

**Notes:** 
- `.__new__(..)` is an instance method, contrary to _Python_ (the 
  inspiration for this protocol). This is done intentionally as in
  JavaScript there is no distinction between an instance and a class and
  defining `.__new__(..)` in the class would both add complexity as well 
  as restrict the use-cases for the constructor.


### Extending the constructor

```javascript
var C = object.Constructor('C',
	// this will get mixed into the constructor C...
	{
		constructor_attr: 123,

		constructorMethod: function(){
			// ...
		},

		// ...
	}, {
		instanceMethod: function(){
			// get constructor data...
			var x = this.constructor.constructor_attr

			// ...
		},
		// ...
	})
```

And the same thing while extending...
```javascript
var D = object.Constructor('D', C,
	// this will get mixed into C(..)...
	{
		// ...
	}, {
		// ...
	})
```


### Inheriting from native constructor objects

```javascript
var myArray = object.Constructor('myArray', Array, {
	// ...
})
```

All special methods and protocols defined by _object.js_ except for 
`.__new__(..)` will work here without change.

For details on `.__new__(..)` and native `.constructor(..)` interaction 
see: [Extending native `.constructor(..)`](#extending-native-constructor)


### Extending native `.constructor(..)`

Extending `.constructor(..)` is not necessary in most cases as 
`.__init__(..)` will do everything generally needed, except for instance 
replacement.

```javascript
var myArray = object.Constructor('myArray', Array, {
	__new__: function(context, ...args){
		var obj = Reflect.construct(myArray.__proto__, args, myArray)

		// ...

		return obj
	},
})
```



## Components

Get sources for attribute
```
sources(<object>, <name>)
sources(<object>, <name>, <callback>)
	-> <list>
```


Get parent attribute value or method
```
parent(<prototype>, <name>)
	-> <parent-value>
	-> undefined

parent(<method>, <this>)
	-> <parent-method>
	-> undefined
```

_Edge case: The `parent(<method>, ..)` has one potential pitfall -- in 
the rare case where a prototype chain contains two or more references 
to the same method under the same name, `parent(..)` can't distinguish 
between these references and will always return the second one._


Get parent property descriptor

```
parentProperty(<prototype>, <name>)
	-> <prop-descriptor>
	-> undefined
```


Get parent method and call it
```
parentCall(<prototype>, <name>, <this>)
	-> <result>
	-> undefined

parentCall(<method>, <this>)
	-> <result>
	-> undefined
```


Mixin objects into a prototype chain
```
mixin(<root>, <object>, ..)
	-> <object>
```


Mixin contents of objects into one
```
mixinFlat(<root>, <object>, ..)
	-> <object>
```
This is like `Object.assign(..)` but copies property objects rather than
property values.


Make a raw (un-initialized) instance
```
makeRawInstance(<context>, <constructor>, ..)
	-> <object>
```

A shorthand to this is `Constructor.__rawinstance__(context, ..)`.


Define an object constructor
```
Constructor(<name>)
Constructor(<name>, <prototype>)
Constructor(<name>, <parent-constructor>, <prototype>)
Constructor(<name>, <parent-constructor>, <constructor-mixin>, <prototype>)
Constructor(<name>, <constructor-mixin>, <prototype>)
	-> <constructor>
```


Shorthand to `Constructor(..)`
```
C(<name>, ..)
	-> <constructor>
```



## Utilities

Align text to shortest leading whitespace
```
normalizeIndent(<text>)
normalizeIndent(<text>, <tab-size>)
	-> <text>
```

This is used to format `.toString(..)` return values for nested functions
to make source printing in console more pleasant to read.



## Limitations

### Can not mix unrelated native types

At this point we can't mix native types, for example it is not possible 
to make a callable `Array` object...

This is not possible in current _JavaScript_ implementations directly 
as most builtin objects rely on "hidden" mechanics and there is no way 
to combine or inherit them.

To illustrate:
```javascript
// produces an Array that looks like a function but does not act like one...
var a = Reflect.construct(Array, [], Function)

// creates a function that looks like an array... 
var b = Reflect.construct(Function, [], Array)
```

So these will produce partially broken instances:
```javascript
var A = object.Constructor('A', Array, function(){ .. })

var B = object.Constructor('B', Array, {
	__call__: function(){ .. },
})
```

Essentially this issue and the inability to implement it without 
emulation, shows the side-effects of two "features" in _JavaScript_:
- lack of multiple inheritance
- _hidden_ protocols/functionality (namely: calls, attribute access)

Still, this is worth some thought.



## License

[BSD 3-Clause License](./LICENSE)

Copyright (c) 2019, Alex A. Naanou,  
All rights reserved.

<!-- vim:set ts=4 sw=4 spell : -->
