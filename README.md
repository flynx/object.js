# object.js

object.js provides a set of tools for constructing and maintaining object
constrictors and for managing their inheritance relations.


This is an elternative to the ES6 `class` syntax in JavaScript and provides 
several advantages:  
- simple way to define normal and class methods, properties and attributes,
- uniform and minimalistic definition syntax based on basic JavaScript 
  object syntax no special cases or special syntax,
- _transparantly_ based on _JavaScript's_ prototypical inheritance model,
- more granular instance construction (a-la _Python's_ `.__new__(..)` 
  and `.__init__(..)` methods)
- less restrictive:
    - `new` is optional
    - all input components are reusable

Disadvantages compared to the `class` syntax:  
- no _sytactic sugar_
- a slightly more complicated `super` call method


## Usage

```javascript
var object = require('ig-object')
```

Create a basic constructor...

```javascript
// NOTE: new is optional here...
var A = new object.Constructor('A', {})
```


In _JavaScript_ constructor `B` inherits from constructor `A` iff 
`B.prototypes` is _prototype_ of `A.prototype`. So to implement inheritance 
we simply need to _link_ the prototypes of two constructors via `.__proto__`,
`Object.create(..)` or other means.

```javascript
// NOTE: we could simply use A() or new A() here but that would call
//      the active constructors if they are defined which might not be
//      desirable at definition time...
var B = object.Constructor('B', {__proto__: A.prototype})
var C = object.Constructor('C', Object.create(B.prototype))
```

```javascript
var c = C() // or new C()

c instanceof C // -> true
c instanceof B // -> true
c instanceof A // -> true
```

```javascript
var Base = object.Constructor('Base', {
    get prop(){
        return 123 },
    method: function(){
        console.log('Base.method()') },

    // initializer...
    __init__: function(){
        this.base_attribute = 321
    },
})

var Item = object.Constructor('Item', {
    // inherit from BaseItem...
    __proto__: Base.prototype,

    __init__: function(){
        // call the "super" method...
        object.parent(this.__init__, this).call(this)
        this.item_attribute = 333
    },
})

```


## Components

```
parent(<method>, <this>)
parent(<method>, <name>, <this>)
    -> <parent-method>
```

```
mixin(<root>, <object>, ...)
    -> <object>
```

```
mixinFlat(<root>, <object>, ...)
    -> <object>
```

```
makeConstructor(<name>, <prototype>)
makeConstructor(<name>, <class-prototype>, <prototype>)
    -> <constructor>
```



## License

[BSD 3-Clause License](./LICENSE)

Copyright (c) 2019, Alex A. Naanou,  
All rights reserved.

<!-- vim:set ts=4 sw=4 spell : -->