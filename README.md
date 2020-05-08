# object.js

_object.js_ is a set of tools and abstractions to create and manage 
constructors, objects and prototype chains in idiomatic JavaScript.

This is an alternative to the ES6 `class` syntax in JavaScript and provides 
several advantages:  
- _Uniform and minimalistic_ definition "syntax" based on basic JavaScript 
  object literals. No special cases, special syntax or _"the same but slightly
  different"_ ways to do things,
- _Transparently_ based on JavaScript's prototypical inheritance model,
- Produces fully introspectable constructors/instances,
- Does not try to emulate constructs foreign to JavaScript (i.e. classes),
- Granular 2-stage instance construction and initialization (a-la 
  _Python's_ `.__new__(..)` and `.__init__(..)` methods),
- Simple way to define callable instances (including a-la _Python's_ 
  `.__call__(..)`),
- Less restrictive:
	- `new` is optional,
	- all input components are reusable JavaScript objects,
	- no artificial restrictions.

Disadvantages compared to the `class` syntax:  
- No _syntactic sugar_,
- Slightly more complicated calling of `parent` (_super_) methods.

Note that the produced constructors and objects are functionally 
identical (almost) to the ones produced via ES6 classes and are 
interchangeable with them.


Here is a basic comparison:
<table border="0" width="100%">
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

- No _direct_ way to do "private" definitions,
- Clear separation of constructor and `.prototype`  
  For example, in `B`:
	- First block (optional) is merged with `B`,
	- Second block _is_ the `B.prototype`,
- No special syntax, stands out less.

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
  calling a _constructor_ a class is not correct,
- `static` and instance definitions are not separated,
- lots of details done non-transparently under the hood.

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
		- [`sources(..)`](#sources)
		- [`parent(..)`](#parent)
		- [`parentProperty(..)`](#parentproperty)
		- [`parentCall(..)`](#parentcall)
		- [`mixin(..)`](#mixin)
		- [`mixins(..)`](#mixins)
		- [`hasMixin(..)`](#hasmixin)
		- [`mixout(..)`](#mixout)
		- [`mixinFlat(..)`](#mixinflat)
		- [`makeRawInstance(..)`](#makerawinstance)
		- [`Constructor(..)` / `C(..)`](#constructor--c)
	- [Utilities](#utilities)
		- [`normalizeIndent(..)`](#normalizeindent)
		- [`match(..)`](#match)
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
//	  Base <--- Item <--- SubItem
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

// normal instance prototype chain:
//	b -> Base.prototype -> .. 
//
var b = Base()

// mixin directly into the instance...
//
// now the prototype chain looks like this:
//	b -> mixinFlat({}, utilityMixin) -> Base.prototype -> ..
//
object.mixin(b, utilityMixin)
```

`.mixin(..)` will copy the contents of `utilityMixin` into the prototype 
chain between `b` and `b.__proto__`.

We can also remove the mixin...
```javascript
o.mixout(b, utilityMixin)
```

The mixed-in data is removed iff a [matching](#match) object is found in 
the chain with the same attributes as `utilityMixin` and with each 
attribute matching identity with the corresponding attribute in the mixin.


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

Like [_function constructor_ and `.__call__(..)`](#callable-instances) 
this also has two contexts, but the internal context is different -- as
it is the job of `.__new__(..)` to create an instance, at time of call 
the instance does not exist and `this` references the `.prototype` 
object.

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
var D = object.Constructor('D', C, {
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

Note that all of the following are generic and will work on any relevant
JavaScript object.

For example, this will happily create a normal native array object 
`['a', 'b', 'c']`:
```javascript
var l = object.makeRawInstance(null, Array, 'a', 'b', 'c')
```


### `sources(..)`

Get sources for attribute
```
sources(<object>, <name>)
sources(<object>, <name>, <callback>)
	-> <list>
```

```
callback(<source>)
	-> 'stop' | false
	-> undefined
```


### `parent(..)`

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



### `parentProperty(..)`

Get parent property descriptor
```
parentProperty(<prototype>, <name>)
	-> <prop-descriptor>
	-> undefined
```


### `parentCall(..)`

Get parent method and call it
```
parentCall(<prototype>, <name>, <this>)
	-> <result>
	-> undefined

parentCall(<method>, <this>)
	-> <result>
	-> undefined
```


### `mixin(..)`

_Mixin_ objects into a prototype chain
```
mixin(<base>, <object>, ..)
	-> <base>
```

This will link the base `.__proto__` to the last _mixin_ in chain, 
keeping the prototype visibility the same.

This will copy the content of each input object without touching the 
objects themselves, making them fully reusable.


### `mixins(..)`

Get matching mixins
```
mixins(<base>, <object>)
mixins(<base>, [<object>, ..])
mixins(<base>, <object>, <callback>)
mixins(<base>, [<object>, ..], <callback>)
	-> list
```

```
callback(<match>, <object>, <parent>)
	-> 'stop' | false
	-> undefined
```


### `hasMixin(..)`

Check of object has mixin
```
hasMixin(<base>, <mixin>)
	-> <bool>
```


### `mixout(..)`

Remove the first match for each object out of a prototype chain
```
mixout(<base>, <object>, ..)
mixout(<base>, 'first', <object>, ..)
	-> <base>
```

Remove all occurrences of each object out of a prototype chain
```
mixout(<base>, 'all', <object>, ..)
	-> <base>
```

This is the opposite of `mixin(..)`


### `mixinFlat(..)`

Mixin contents of objects into one _base_ object
```
mixinFlat(<base>, <object>, ..)
	-> <base>
```
This is like `Object.assign(..)` but copies property descriptors rather 
than property values.


### `makeRawInstance(..)`

Make a raw (un-initialized) instance
```
makeRawInstance(<context>, <constructor>, ..)
	-> <object>
```

`makeRawInstance(..)` will do the following:
- Create an instance object
	- get result of `.__new__(..)` if defined, or
	- if prototype is a function or `.__call__(..)` is defined, create a 
	  wrapper function, or
	- if constructor's `.__proto__` is a function (constructor) use it 
	  to create an instance, or
	- use `{}`.
- Link the object into the prototype chain


### `Constructor(..)` / `C(..)`

Define an object constructor
```
Constructor(<name>)
Constructor(<name>, <prototype>)
Constructor(<name>, <parent-constructor>, <prototype>)
Constructor(<name>, <parent-constructor>, <constructor-mixin>, <prototype>)
Constructor(<name>, <constructor-mixin>, <prototype>)
	-> <constructor>
```

`Constructor(..)` essentially does the following:
- Creates a _constructor_ function,
- Sets constructor `.name` and `.toString(..)` for introspection,
- Creates `.__rawinstance__(..)` wrapper to `makeRawInstance(..)`
- Sets constructor `.__proto__`, `.prototype` and `.prototype.constructor`,
- Mixes in _constructor-mixin_ if given.

The resulting _constructor_ function when called will:
- call constructor's `.__rawinstance__(..)` if defined or `makeRawInstance(..)` 
  to create an instance,
- call instance's `.__init__(..)` if present.


Shorthand to `Constructor(..)`
```
C(<name>, ..)
	-> <constructor>
```



## Utilities

### `normalizeIndent(..)`

Align text to shortest leading whitespace
```
normalizeIndent(<text>)
normalizeIndent(<text>, <tab-size>)
	-> <text>
```

This is used to format `.toString(..)` return values for nested functions
to make source printing in console more pleasant to read.


### `match(..)`

Test if the two objects match in attributes and attribute values
```
match(base, obj)
	-> bool
```

This relies on first level object structure to match the input object, for 
a successful match one of the following must apply:
- object are identical

or:
- `typeof` matches _and_,
- attribute count matches _and_,
- attribute names match _and_,
- attribute values are identical.



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
