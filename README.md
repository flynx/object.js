# object.js

_object.js_ is a set of tools and abstractions to create and manage 
constructors, objects and prototype chains in idiomatic JavaScript.

This is an alternative to the ES6 `class` syntax in JavaScript and provides 
several advantages:  
- _Uniform and minimalistic_ definition "syntax" based on basic JavaScript 
  object literals. No special cases, special syntax or _"the same but slightly
  different"_ ways to do things, trying to adhere to [POLS] as much as possible,
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

[POLS]: https://en.wikipedia.org/wiki/Principle_of_least_astonishment


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
  - [Special methods](#special-methods)
    - [`<object>.__new__(..)`](#object__new__)
    - [`<object>.__init__(..)`](#object__init__)
    - [`<object>.__call__(..)`](#object__call__)
  - [Components](#components)
    - [`STOP` / `STOP(..)`](#stop--stop)
    - [`ASIS(..)`](#asis)
    - [`Constructor(..)` / `C(..)`](#constructor--c)
    - [`create(..)` / `Constructor.create(..)`](#create--constructorcreate)
    - [`sources(..)` / `Constructor.sources(..)`](#sources--constructorsources)
    - [`entries(..)` / `Constructor.entries(..)`](#entries--constructorentries)
    - [`values(..)` / `Constructor.values(..)`](#values--constructorvalues)
    - [`parent(..)` / `Constructor.parent(..)`](#parent--constructorparent)
    - [`parentProperty(..)` / `Constructor.parentProperty(..)`](#parentproperty--constructorparentproperty)
    - [`parentCall(..)` / `Constructor.parentCall(..)`](#parentcall--constructorparentcall)
    - [`parentOf(..)` / `childOf(..)` / `related(..)` and `Constructor.*(..)` variants](#parentof--childof--related-and-constructor-variants)
    - [`RawInstance(..)`](#rawinstance)
    - [`Mixin(..)`](#mixin)
    - [`<mixin>(..)`](#mixin-1)
    - [`<mixin>.mode`](#mixinmode)
    - [`<mixin>.mixout(..)`](#mixinmixout)
    - [`<mixin>.isMixed(..)`](#mixinismixed)
    - [`mixin(..)` / `Mixin.mixin(..)`](#mixin--mixinmixin)
    - [`mixinFlat(..)` / `Mixin.mixinFlat(..)`](#mixinflat--mixinmixinflat)
    - [`mixout(..)` / `Mixin.mixout(..)`](#mixout--mixinmixout)
    - [`mixins(..)` / `Mixin.mixins(..)`](#mixins--mixinmixins)
    - [`hasMixin(..)` / `Mixin.hasMixin(..)`](#hasmixin--mixinhasmixin)
  - [Utilities](#utilities)
    - [`deepKeys(..)` / `Constructor.deepKeys(..)`](#deepkeys--constructordeepkeys)
    - [`match(..)` / `Constructor.match(..)`](#match--constructormatch)
    - [`matchPartial(..)` / `Constructor.matchPartial(..)`](#matchpartial--constructormatchpartial)
  - [Limitations](#limitations)
    - [Can not mix unrelated native types](#can-not-mix-unrelated-native-types)
  - [More](#more)
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
var A = new object.Constructor('A', {})

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

**Note:**
- in `object.Constructor('X', A)` the second argument is used as the 
  _prototype_, to use `A` as a parent constructor add an empty object 
  as a third argument, i.e. 'object.Constructor('X', A, {})'  
  (see: [`Constructor(..)` / `C(..)`](#constructor--c) for more info)


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
	method: function(){
		// ... 

		// call the "super" method...
		return object.parentCall(Item.prototype, 'method', this, ...arguments)
	},

	__init__: function(...args){
		// call the "super" method...
		object.parentCall(this.__init__, this, ...args)

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

// a more flexible approach...
//
// This is the same as the above but a bit more convenient as we do 
// not need to use Object.assign(..) or object.mixinFlat(..) to define
// attributes and props.

var Action2 = object.Constructor('Action2', {
	__call__: function(context, ...args){
		// call the callable parent...
		return object.parentCall(Action2.prototype, '__call__', this, ...arguments)
	},
})


var action = Action()
var action2 = new Action2()

// the instances are now functions...
action()
action2()
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

When calling the parent passing `'__call__'` will get the parent in both 
the function and `.__call__(..)` implementations, but extra care must be 
taken in passing the reference prototype to `.parentCall(..)`, the instance
is implemented as a proxy function that will pass the arguments to the 
implementation (i.e. `this.constructor.prototype(..)`) so this proxy 
function as well as the `.constructor.prototype(..)` are valid implementations
and both will be retrieved by `sources(this, '__call__')`, 
`values(this, '__call__')` and by extension `parent(this, '__call__')` 
and friends, so this is another reason not to use `this` in the general 
case.


**Notes:**
- The two approaches (_function_ vs. `.__call__(..)`) will produce 
  functionally identical but structurally different constructors/objects, 
  the difference is in `.prototype` -- what is defined as the prototype
  _is_ the prototype (_POLS_), so we get:

  	- _prototype function_ -> `.prototype` is that exact function object,
	- `.__call__(..)` -> `.prototype` is _the_ object with the `.__call__(..)` 
	  method.

  The instance in both cases is a function wrapper that will proxy the 
  call to the corresponding implementation.
  (this may change in the future)
- Making an object callable does not guarantee that `<obj> instanceof Function`
  will be `true`, though `typeof(<obj>) == 'function'`will always work.
  To satisfy the `instanceof Function` test the prototype tree must be 
  rooted in `Function`.


### Mix-ins

<!-- XXX do an example using Mixin(..) -->

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

The mixed-in data is removed iff a [matching](#match--constructormatch) 
object is found in the chain with the same attributes as `utilityMixin` and 
with each attribute matching identity with the corresponding attribute in 
the mixin.


Constructor-based mixin...
```javascript
var UtilityMixin = function(parent){
	return object.Constructor(parent.name + '+utils', parent, utilityMixin) }

var Mixed = object.Constructor('Mixed', UtilityMixin(Base), {
	// ...
})

var m = Mixed()
```

**Notes:**
- It is not recommended to `.mixin(..)` into constructors directly, use 
  `.mixinFlat(..)` instead.



## Advanced usage

### Low level constructor

```javascript
var LowLevel = object.Constructor('LowLevel', {
	__new__: function(context, ...args){
		return {}
	},
})

```

The value `.__new__(..)` returns is used as the instance and gets linked 
to the prototype chain by the calling constructor's `.__rawinstance__(..)`,
the constructor then will call `.__init__(..)` if defined.

_Note that `.__init__(..)` is called by the constructor and not by
`RawInstance(..)` or `.__rawinstance__(..)`._

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
 
This has priority over the callable protocols above, thus the user must
take care of both the _function constructor_ and `prototype.__call__(..)` 
handling.


### Extending the constructor

```javascript
var C = object.Constructor('C', {
	// this will get mixed into the constructor C...

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



## Special methods

### `<object>.__new__(..)`

Create new instance object.

```
<object>.__new__(<context>, ..)
	-> <instance>
```

This is called in the context of `<constructor>` as at time of call 
no instance exists yet. 

`<context>` is the _outer_ context of the call, i.e. the object from which 
`<constructor>` was referenced before it was called.

Any value returned by `.__new__(..)` will be integrated into the prototype 
chain of `<object>`, if this is not desired then wrap it in 
[`object.ASIS(..)`](#asis) before returning, but note that this will 
not prevent `<object>.__init__(..)` from being called. The `ASIS(..)`-wrapped 
value will be unwrapped before being returned by the constructor.


For more info see: 
- [Low level constructor](#low-level-constructor), 
- [Inheriting from native constructor objects](#inheriting-from-native-constructor-objects)
- [Extending native `.constructor(..)`](#extending-native-constructor)


### `<object>.__init__(..)`

Initialize the instance.

```
<object>.__init__(..)
```

Return value is ignored.


### `<object>.__call__(..)`

Call the object.

```
<object>.__call__(<context>, ..)
	-> <result>
```

This is called in the context of `<object>`. 

`<context>` is the _outer_ context of the call, i.e. the object from which 
`<object>` was referenced before it was called.

For more info see: [Callable instances](#callable-instances)



## Components

Note that all of the following are generic and will work on any relevant
JavaScript object.

For example, this will happily create a normal native array object 
`['a', 'b', 'c']`:
```javascript
var l = object.RawInstance(null, Array, 'a', 'b', 'c')
```


### `STOP` / `STOP(..)`

Used in [`sources(..)`](#sources--constructorsources), 
[`values(..)`](#values--constructorvalues) and 
[`mixins(..)`](#mixins--mixinmixins) 
to stop the search before it reaches the top of 
the prototype chain.


### `ASIS(..)`

Can be used in [`.__new__(..)`](#object__new__) to wrap the returned object to 
prevent changing it's prototype by [`RawInstance()`](#rawinstance).


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
- Creates `.__rawinstance__(..)` wrapper to `RawInstance(..)`
- Sets constructor `.__proto__`, `.prototype` and `.prototype.constructor`,
- Mixes in _constructor-mixin_ if given.

The resulting _constructor_ function when called will:
- call constructor's `.__rawinstance__(..)` if defined or `RawInstance(..)` 
  to create an instance,
- call instance's `.__init__(..)` if present.


Note that `Constructor(<name>, <prototype>)` is intentionally set as default
instead of having the _parent-constructor_ as the last argument, this is 
done for two reasons:
- The main cause to inherit from a constructor is to extend it,
- In real code the `Constructor(<name>, <prototype>)` is more common than
  empty inheritance.


Shorthand to `Constructor(..)`
```bnf
C(<name>, ..)
	-> <constructor>
```


`Constructor(..)` / `C(..)` and their products can be called with and without 
`new`.



### `create(..)` / `Constructor.create(..)`

Create a new object from the given

```bnf
create(<base>)
    -> <obj>
```

For functions we can set `.name`
```bnf
create(<name>, <base-func>)
    -> <func>
```


This is similar to [`Object.create(..)`] but handles callables correctly, i.e. if 
`<base>` is a callable then `<obj>` will also be callable.

`<obj>` respects the call protocol, and will call `<obj>.__call__(..)` if defined.


[`Object.create(..)`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create



### `sources(..)` / `Constructor.sources(..)` 

Iterate the sources for attribute
```
sources(<object>)
sources(<object>, <name>)
	-> <iterator>
```

If no name is given iterate through all the parents.

Special case: get callable implementations
```
sources(<object>, '__call__')
	-> <iterator>
```

This will iterate the callable implementations regardless of the actual
implementation details, i.e. both function prototype or `.__call__(..)` 
methods will be matched.


### `entries(..)` / `Constructor.entries(..)` 

Iterate `<soruce>`-`<value>` pairs for attribute in the prototype chain.
```
entries(<object>, <name>)
	-> <iterator>
```


Iterate property descriptors for attribute in prototype chain
```
entries(<object>, <name>, true)
	-> <iterator>
```

Special case: get callable implementations
```
entries(<object>, '__call__')
	-> <iterator>
```

This will yield the callable objects themselves or the value of `.__call__`.


### `values(..)` / `Constructor.values(..)` 

Iterate values for attribute in prototype chain
```
values(<object>, <name>)
	-> <iterator>
```

Iterate property descriptors for attribute in prototype chain
```
values(<object>, <name>, true)
	-> <list>
```

Special case: get callable implementations
```
values(<object>, '__call__')
	-> <list>
```

This will yield the callable objects themselves or the value of `.__call__`.


See [`sources(..)`](#sources--constructorsources) for docs on `callback(..)` 
and special cases.


### `parent(..)` / `Constructor.parent(..)` 

Get parent attribute value or method
```
parent(<prototype>, <name>)
	-> <parent-value>
	-> undefined
```

It is recommended to use the relative`<constructor>.prototype` as 
`<prototype>` and in turn not recommended to use `this` or `this.__proto__` 
as they will not provide the appropriate reference point in the prototype 
chain for the current method and may result in infinite recursion.

For access to parent methods the following special case is better.

```
parent(<method>, <this>)
	-> <parent-method>
	-> undefined
```


_Edge case: The `parent(<method>, ..)` has one potential pitfall -- in 
the rare case where a prototype chain contains two or more references 
to the same method under the same name, `parent(..)` can't distinguish 
between these references and will always return the second one._


Special case: get the parent callable implementation
```
parent(<prototype>, '__call__')
	-> <parent-value>
	-> undefined
```

See [`sources(..)`](#sources--constructorsources) for more info on the 
special case.


### `parentProperty(..)` / `Constructor.parentProperty(..)` 

Get parent property descriptor
```
parentProperty(<prototype>, <name>)
	-> <prop-descriptor>
	-> undefined
```


### `parentCall(..)` / `Constructor.parentCall(..)` 

Get parent method and call it
```
parentCall(<prototype>, <name>, <this>)
	-> <result>
	-> undefined

parentCall(<method>, <this>)
	-> <result>
	-> undefined
```

Special case: call the parent callable implementation
```
parentCall(<prototype>, '__call__', <this>)
	-> <result>
	-> undefined
```

See [`parent(..)`](#parent--constructorparent) and 
[`sources(..)`](#sources--constructorsources) for more details.

### `parentOf(..)` / `childOf(..)` / `related(..)` and `Constructor.*(..)` variants

Test if a is parent of b and/or vice-versa.
```
parentOf(<parent>, <child>)
	-> <bool>

childOf(<child>, <parent>)
	-> <bool>

related(<a>, <b>)
	-> <bool>
```

These are similar to `instanceof` but will test if the two objects are in the 
same prototype chain and in case of `parentOf(..)`/`childOf(..)` in what order.


### `RawInstance(..)`

Make a raw (un-initialized) instance
```
RawInstance(<context>, <constructor>, ..)
	-> <object>
```

`RawInstance(..)` will do the following:
- Create an instance object
	- get result of `.__new__(..)` if defined, or
	- if prototype is a function or `.__call__(..)` is defined, create a 
	  wrapper function, or
	- if constructor's `.__proto__` has a `.__rawinstance__(..)` use it
	  to create an instance, or
	- if constructor's `.__proto__` is a function (constructor) use it 
	  to create an instance, or
	- use `{}`.
- Link the object into the prototype chain


_Un-initialized_ means this will not call `.__init__(..)`


`RawInstance(..)` can be called with and without `new`.


### `Mixin(..)`

Create a mixin wrapper.
```
Mixin(<name>, <obj>, ..)
	-> <mixin>
```

This will create a more convenient `<mixin>` object.

The following two are the same
```javascript
var mixin = {
	// ...
}

var obj = mixinFlat({
	// ...
}, mixin)
```
and
```javascript
var mixin = Mixin('mixin', {
	// ...
})

var obj = mixin('flat', {
	// ...
})
```

The former approach is better suited for inline mixing in, where one could
use `Object.assign(..)` while the later is more convenient for working with
library and reusable _mixin_ object as it is more readable and more centralized.

This also makes combining mixins simpler
```javascript
var A = Mixin('A', {
	// ...
})

var B = Mixin('B', {
	// ...
})

// this is a combination of A and B...
var C = Mixin('C', A, B, {
	// NOTE: this "block" is optional...
	// ...
})
```

Note that for multiple mixins used in `Mixin(..)` as well as in 
[`mixin(..)`](#mixin--mixinmixin)/[`mixinFlat(..)`](#mixinflat--mixinmixinflat),
mixins from right to left, e.g. in the above example `B` will overwrite 
intersecting data in `A`, ... etc.


### `<mixin>(..)`

Mixin into `<target>` as a prototype
```
<mixin>(<target>)
<mixin>('proto', <target>)
	-> <target>
```

Mixin into `<target>` directly (flatly)
```
<mixin>('flat', <target>)
	-> <target>
```

These are similar to using [`mixin(..)`](#mixin--mixinmixin) or 
[`mixinFlat(..)`](#mixinflat--mixinmixinflat) respectively.


### `<mixin>.mode`

Sets the default mode for `<mixin>(..)`.

Can be:
- `proto`  
	mix into prototype objects, like [`mixin(..)`](#mixin--mixinmixin)
- `flat`  
	mix into object directly, like [`mixinFlat(..)`](#mixinflat--mixinmixinflat)


### `<mixin>.mixout(..)`

Remove `<mixin>` from `<target>`
```
<mixin>.mixout(<target>)
	-> <target>
```

This is the same as [`mixout(..)`](#mixout--mixinmixout)


### `<mixin>.isMixed(..)`

Check if `<mixin>` is mixed into `<target>`
```
<mixin>.isMixed(<target>)
	-> <bool>
```

This is the same as [`hasMixin(..)`](#hasmixin--mixinhasmixin)


### `mixin(..)` / `Mixin.mixin(..)`

_Mixin_ objects into a prototype chain
```
mixin(<base>, <object>, ..)
	-> <base>
```

This will link the base `.__proto__` to the last _mixin_ in chain, 
keeping the prototype visibility the same.

This will copy the content of each input object without touching the 
objects themselves, making them fully reusable.

It is not recommended to `.mixin(..)` into constructors directly, use 
`.mixinFlat(..)` instead.


### `mixinFlat(..)` / `Mixin.mixinFlat(..)`

Mixin contents of objects into one _base_ object
```
mixinFlat(<base>, <object>, ..)
	-> <base>
```
This is like `Object.assign(..)` but copies property descriptors rather 
than property values.

Also like `Object.assign(..)` this _will_ overwrite attribute values in 
`<base>`.


### `mixout(..)` / `Mixin.mixout(..)`

Remove the _first_ match matching input _mixin_ from _base_ 
of _base_
```
mixout(<base>, <object>, ..)
mixout(<base>, 'first', <object>, ..)
	-> <base>
```

Remove _all_ occurrences of each matching input _mixin_ from _base_
```
mixout(<base>, 'all', <object>, ..)
	-> <base>
```

This is the opposite of `mixin(..)`


### `mixins(..)` / `Mixin.mixins(..)`

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
	-> STOP 
	-> undefined
	-> <value>
```

See [`sources(..)`](#sources--constructorsources) for docs on `callback(..)`


### `hasMixin(..)` / `Mixin.hasMixin(..)`

Check if _base_ object has _mixin_
```
hasMixin(<base>, <mixin>)
	-> <bool>
```



## Utilities

### `deepKeys(..)` / `Constructor.deepKeys(..)`

```
deepKeys(<obj>)
	-> <keys>
```

```
deepKeys(<obj>, <stop>)
	-> <keys>
```

This is like `Object.keys(..)` but will get the keys from the whole 
prototype chain or until `<stop>` if given.


### `match(..)` / `Constructor.match(..)`

Test if the two objects match in attributes and attribute values
```
match(<base>, <obj>)
	-> <bool>
```

This relies on first level object structure to match the input object, for 
a successful match one of the following must apply:
- object are identical

or:
- `typeof` matches _and_,
- attribute count matches _and_,
- attribute names match _and_,
- attribute values are identical.


Non-strict match
```
match(<base., <obj>, true)
	-> <bool>
```

Like the default case but uses _equality_ instead of _identity_ to match
values.


### `matchPartial(..)` / `Constructor.matchPartial(..)`

```
matchPartial(<base>, <obj>)
	-> <bool>

// non-strict version...
matchPartial(<base>, <obj>, true)
	-> <bool>
```

Like `.match(..)` but will check for a partial match, i.e. when `obj` is 
a non-strict subset of `base`.



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



## More

For more info see the [source...](./object.js)



## License

[BSD 3-Clause License](./LICENSE)

Copyright (c) 2016-2023, Alex A. Naanou,  
All rights reserved.


<!-- vim:set ts=4 sw=4 spell : -->
