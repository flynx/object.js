# object.js

_object.js_ provides a set of tools for making and maintaining object
constructors and for managing their inheritance relations.


This is an alternative to the ES6 `class` syntax in JavaScript and provides 
several advantages:  
- Simple way to define instance and "class" methods, properties and attributes,
- Uniform and minimalistic definition syntax based on basic JavaScript 
  object syntax, no special cases, special syntax or _"the same but slightly 
  different"_ ways to do things,
- _Transparently_ based on JavaScript's prototypical inheritance model,
- Granular instance construction (a-la _Python's_ `.__new__(..)` 
  and `.__init__(..)` methods)
- Simple way to define callable instances (including a-la _Python's_ 
  `.__call__(..)`)
- Less restrictive:
    - `new` is optional
    - all input components are reusable
	- no artificial restrictions

Disadvantages compared to the `class` syntax:  
- No _syntactic sugar_
- Slightly more complicated calling of `parent` (_super_) methods



## Installation

```bash
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
```


In _JavaScript_ constructor `B` inherits from constructor `A` iff 
`B.prototype` is _prototype_ of `A.prototype`. So to implement inheritance 
we simply need to _link_ the prototypes of two constructors via `.__proto__`,
`Object.create(..)` or other means.

```javascript
var B = object.Constructor('B', {__proto__: A.prototype})

var C = object.Constructor('C', Object.create(B.prototype))
```

```javascript
var c = C() // or new C()

c instanceof C // -> true
c instanceof B // -> true
c instanceof A // -> true
```


### Inheritance
```javascript
//
//    Base <--- Item
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

var Item = object.Constructor('Item', {
    // inherit from Base...
    __proto__: Base.prototype,

    __init__: function(){
        // call the "super" method...
        object.parentCall(this.prototype.__init__, this)

        this.item_attr = 'instance attribute value'
    },
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
between these references and will always return the first one._


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
mixin(<root>, <object>, ...)
    -> <object>
```

Mixin contents of objects into one
```
mixinFlat(<root>, <object>, ...)
    -> <object>
```
This is like `Object.assign(..)` but copies property objects rather than
property values.

Make a raw (un-initialized) instance
```
makeRawInstance(<context>, <constructor>, ...)
	-> <object>
```

_EXPERIMENTAL: a shorthand to this is defined as `Constructor.__rawinstance__(context, ..)`_

Define an object constructor
```
Constructor(<name>, <prototype>)
Constructor(<name>, <class-prototype>, <prototype>)
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


## License

[BSD 3-Clause License](./LICENSE)

Copyright (c) 2019, Alex A. Naanou,  
All rights reserved.

<!-- vim:set ts=4 sw=4 spell : -->
