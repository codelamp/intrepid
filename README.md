# Intrepid

## Overview

This is a simple utility for navigating structures, it has been broken off from my Theory lib, because it was complex enough to stand alone, and is still in progress.

For now there is only a simple Query language available via `intrepid.simpleQuery` but there will be more to follow shortly, like the Object Path Notation that theory was developing.

## Getting started

Just install the module from Github:

    git clone git@github.com:codelamp/intrepid.git

Or, via npm:

    npm install intrepid --save-dev

This module is designed to work both in the browser and node environments, and supports CommonJS, AMD and global import.

Node usage:

    var intrepid = require('intrepid');

Browser usage:

    <script src="node_modules/intrepid/src/intrepid.js"></script>

> The build process hasn't yet been added, so only the src folder exists at the moment.

## Example usage

I have yet to fully develop the API yet, so for now I'm leaving the barebones objects i.e. like `intrepid.simpleQuery` to be referenced. Later on it should be possible to create an intrepid instance that will have the type of query and data handlers paired together. Making the interface more succinct.

A simpleQuery example:

    var testData = {
      a: {
        simple: {
          object: {
            to: 'traverse'
          },
          to: {
            give: {
              an: 'example'
            }
          }
        }
      }
    };
    var q = intrepid.simpleQuery; // ref simpleQuery for reuse
    var n = intrepid.objNav;      // ref objNav to navigate normal js objects
    var o = n.create(testData);   // create a new instance of objNav for particular data
    var s = o.find(q.create(['simple', '**', 'to'])).log(); // run a query and log to console

An OPN example (yet to be imported from Theory.js):

    var q = intrepid.opnQuery;
    var n = intrepid.objNav;
    var o = n.create(testData);
    var s = o.find(q.create('simple/**/to'));

Both querying languages are similar, but intrepid's design shouldn't prevent different kinds of query languages being developed or appropriated.

## Extending intrepid

This library is designed to be extended, and is built following my theory.js construction, although the theory lib itself has been totally removed as a dependency.

### Theory objects

Theory doesn't use constructors or classes generally, instead namespaces are built up as extended and mixed in objects using `Object.create` and `Object.assign`.

Over the years I've come to prefer this approach for a few reasons:

1. Simplicity — everything is an object, not a complex/js-particular type that requires special syntax
2. Openness — in JavaScript, at least the level I code at, there is no point in private/inaccessible structures
3. Extensibility — Objects are easy to inspect, extend and mix
4. Portability — if your structure is mainly an object, it can easily be ported between languages

This approach is not without its issues and gotchas however.

#### Shared references

One thing that is usually a benefit in terms of using classes, is that the language manages references for you. When dealing with plain old JS objects, you are responsible for managing references. I prefer this, as it gives me control, but it takes a bit of getting used to. For example, in PHP, you could have:

    class Test {
      $list = []
    }

As you create instances of `Test`, each one will have a `->list` property, but each list property is unique — basically a new array is created each time. Now using `Object.create()`:

    var Test = {
      list: []
    };

Whenever you create a new instance `Object.create(Test)` the list is the same array, and will be shared between instances. This distinct behavioural difference can cause unexpected side-effects if you aren't aware.

Theory, and Intrepid, get around this issue by either re-defining properties for each newly created instance, or using a system it refers to as namespace.


#### .namespace()

I may rename this in the future, but so far it is the best term I can come up with for what the functionality does. Essentially, when you namespace an object all of its "key" references are de-referenced.

"de-referencing" doesn't mean items no longer have a reference, if that were the case, we'd be no longer talking about objects but rather collected garbage. No, I use de-referencing to mean that a similar object is created in its place, basically it is that "same" object but a different reference.

The reason for doing this can be summed up more easily with an example:

    var a = {
      childObject: {
        with: "its own reference"
      }
    };
    var b = Object.create(a);

With the above construction, I can happily add properties to `b` without fear of changing `a`. Because `b` is its own object (own reference) that inherits from `a`.

    b.hereYouGo = 'Thanks!';

It is a different story however if I try an modify `b.childObject`. This is a shared reference between `a` and `b`. It is the same object.

    b.childObject.dontShareThis = 'hmmm.';

If we imagine that `a` is a constructor following the theory design, it will have `.create()` and `.namespace()` methods.

    var b = a.create();

A standard create request will still retain shared references (it depends on the constructors behaviour), because shared refs save resources and can be useful. You also aren't usually creating an instance only to change its internal structure. You normally only do this if you are aiming to create a new constructor. So, if we were planning for `b` to be a new modified version of `a`, we can do the following:

    var b = a.create().namespace();

Now `b` should have the parts of its structure that allow change dereferenced. The way the dereferencing is applied, depends on `a's` namespace template. This is an internal object that just highlights the properties that need dereferencing, and how they should be dereferenced. So now, as long as `a` defined `childObject` as a property that needed deref, we should be able to:

    b.childObject.modifyWithoutFear = true;

The namespace operation doesn't have to dereference all shared propertied, just the ones outlined in the namespace template. So it is fully possible to still have shared properties after namespacing.

## Documentation

For now the documentation can be found here, it is a work in progress, so please bear with me.

[http://codelamp.github.io/intrepid](http://codelamp.github.io/intrepid)

## Local development

### Building docs

The documentation is powered by jsdoc, so you will need to install the dev dependencies via npm. Once that's done, you can build using:

    npm run make-docs
