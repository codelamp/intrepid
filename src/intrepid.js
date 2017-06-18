/*
Intrepid v0.0.1 - Copyright Phil Glanville 2017

Example usuage:

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
*/
(function (global, factory) {
  if ( typeof exports === 'object' && typeof module !== 'undefined' ) {
    factory(exports);
  }
  else if ( typeof define === 'function' && define.amd ) {
    define(['exports'], factory);
  }
  else {
    factory(global);
  }
}(this, (function(exports){ 'use strict';

/**
 * Minimal export of my is namespace. Just contains some useful var type tests.
 *
 * @namespace is
 */
var is = {
  /**
   * Check that an item quacks like an array.
   *
   * @static
   * @method is.array
   * @param {any} item
   * @return {Boolean} returns true if item has `.join` method
   */
  array: function(item){
    return (item && item.splice && is.callable(item.splice)) ? true : false;
  },
  /**
   * Check that an item is "array like", meaning that it can most likely be treated
   * in the simplest sense as an array. This does not cover checking that it supports
   * array methods i.e. like `slice` or `push`; just the fact that the object has a
   * numeric key structure i.e. `item[0]`, and `.length`
   *
   * This will fail for array-likes that are empty -- this is because we can only
   * check that `.length` is a number -- which is far too open. A special case
   * is made for an arguments object, because we can detect those by checking `.toString()`.
   *
   * I fully expect this method to be expanded as this code encounters other
   * array-likes, e.g. node lists.
   *
   * @method is.arraylike
   * @param {any} item
   * @return {Boolean} returns true if item has `.length` and `[0]`, or `is.array()`, or `is.arguments()`
   */
  arraylike: function(item){
    return ((item && item.length && typeof item[0] !== 'undefined')
      || is.array(item)
      || is.arguments(item))
    ? true : false;
  },
  /**
   * Check that an item is an `Arguments` object.
   *
   * @static
   * @method is.arguments
   * @param {any} item
   * @return {Boolean} returns true if item has `.length` that is a number and reports
   * as `[object Arguments]` when `.toString()-ed`.
   */
  arguments: function(item){
    return item && is.number(item.length) && (Object.prototype.toString.call(item) === '[object Arguments]') ? true : false;
  },
  /**
   * A primitive accounts for numbers, booleans, strings, undefined, NaN and null
   *
   * @static
   * @method is.primitive
   * @param {any} item
   * @return {Boolean} returns true if item reports as not being typeof object
   */
  primitive: function(item){
    return (typeof item !== 'object');
  },
  /**
   * A primitive object accounts for primitives that have been wrapped with
   * their object counterpart
   *
   * @static
   * @method is.primitiveObject
   * @param {any} item
   * @return {Boolean} returns true if item is typeof an object, but its valueOf() reports as not being an object.
   */
  primitiveObject: function(item){
    return (typeof item === 'object') && !!item.valueOf && typeof item.valueOf() !== 'object';
  },
  /**
   * Check that an item is an object. In JavaScript this is almost pointless.
   *
   * @static
   * @method is.object
   * @param {any} item
   * @return {Boolean} returns true if item reports as `typeof object`
   */
  object: function(item){
    return (typeof item === 'object');
  },
  /**
   * Check that an item is callable.
   *
   * @static
   * @method is.callable
   * @param {any} item
   * @return {Boolean} returns true if the item has `.call` and `.apply` methods
   */
  callable: function(item){
    return (item && item.call && item.apply) ? true : false;
  },
  /**
   * Check that an item quacks like an element.
   *
   * @static
   * @method is.element
   * @param {Element} item
   * @return {Boolean} returns true if the item has getElementsByTagName
   */
  element: function(item){
    return !!item.getElementsByTagName;
  }
};

/**
 * Minimal export of my go namespace. Just contains some useful "action" functions.
 *
 * @namespace go
 */
var go = {

  /**
   * Given an object and a callback, the callback will be fired for each key/value that
   * the walk operation can reach.
   *
   * Because this function has so many abilities I'll list them here:
   *
   * - Walk will call your callback in hierarchy order
   *   - the walk callback will receive [value, key, level, path, userdata] as arguments
   *   - when proxying walk callback will receive [value, proxyValue, key, level, path, userdata]
   *   - if your callback returns false, walking will halt, and the overall operation returns false
   *   - if your callback returns a function, it will be called after all sub-elements (below the
   *     current level) have been processed. This has the affect of triggering in reverse-hierarchy order.
   *
   * - You can control to what depth the walk operation occurs by passing the deep param:
   *   - deep as a number will recurse that many levels in.
   *   - deep as boolean true will recurse as deep as possible.
   *   - deep as a function will be treated as a callback to test if we can travel deeper.
   *   - deep callback will receive [value, key, level, path, userdata] as arguments
   *   - when proxying deep callback will receive [value, proxyValue, key, level, path, userdata]
   *
   * - If you pass a proxy object, this object will be stepped along with the same structure as obj.
   *   - All calls to callbacks will receive the found proxy subelement for the current point (or undefined)
   *
   * - All callbacks receive a path parameter, which is an array of all the keys up to the current point.
   * - All callbacks will receive the same userdata param, if you pass it in.
   *
   * > WARNING: There is no protection against recursive loops.
   *
   * @static
   * @method go.walk
   */
  walk: function walk(obj, callback, deep, proxy, userdata, level, path, key, proxing, parent, proxyParent){
    var resultcb, result, deeper, l;
    if ( !level ) { level = 0; proxing = !!proxy; path = []; }
    if ( level && callback ) {
      resultcb = proxing
        ? callback.call(obj, obj, proxy, key, level, path, userdata, parent, proxyParent)
        : callback.call(obj, obj, key, level, path, userdata, parent)
      ;
      if ( resultcb === false ) { return false; }
    }
    // if the callback has made ref alterations, update
    obj = parent ? parent[key]: obj;
    proxy = proxyParent ? proxyParent[key] : proxy;
    //
    if ( deep && deep.call ) {
      deeper = proxing
        ? deep.call(obj, obj, proxy, key, level, path, userdata, parent, proxyParent)
        : deep.call(obj, obj, key, level, path, userdata, parent)
      ;
    }
    else {
      deeper = deep === true || deep < level;
    }
    if ( !level || deeper ) {
      switch ( true ) {
        case is.array(obj):
          for ( key=0, l=obj.length; key<l; key++ ) {
            result = walk(obj[key], callback, deep,
              proxy && proxy[key], userdata, level+1, path.concat([key]), key, proxing, obj, proxy);
            if ( result === false ) { return false; }
          }
        break;
        case is.object(obj):
          for ( key in obj ) {
            if ( !Object.prototype.hasOwnProperty || Object.prototype.hasOwnProperty.call(obj, key) ) {
              result = walk(obj[key], callback, deep,
                proxy && proxy[key], userdata, level+1, path.concat([key]), key, proxing, obj, proxy);
              if ( result === false ) { return false; }
            }
          }
        break;
      }
    }
    if ( resultcb && is.callable(resultcb) ) {
      resultcb.call();
    }
    return null;
  },

  merge: function(a){
    return a; // @TODO:
  },

  _createDerefFunction: function(m){
    return function(){ return m.apply(this, arguments); };
  },

  /**
   * Create a base object, from the type of the o param.
   */
  _createAssignableObject: function(o){
    if ( is.primitive(o) || is.primitiveObject(o) ) {
      return new (Object.getPrototypeOf(o).constructor)(o);
    }
    else if ( is.callable(o) ) {
      return this._createDerefFunction(o);
    }
    else if ( is.array(o) ) {
      return o.slice(0);
    }
    else {
      return Object.create(o);
    }
  },

  /**
   * Internal method used by `go.deref` and `go.derefAssign` to follow a dereference template
   *
   * @private
   * @static
   * @method go.deref
   */
  _derefWithTemplate: (function(){
    // set up the error exception
    function drefTemplateError(msg){
      this.message = msg;
      // Use V8's native method if available, otherwise fallback
      if ("captureStackTrace" in Error) {
        Error.captureStackTrace(this, drefTemplateError);
      }
      else {
        this.stack = (new Error()).stack;
      }
    };
    drefTemplateError.prototype = new Error();
    // return the actual function
    return function(obj, proxy, key, level, path, ud, parent, proxyParent){
      if ( proxy === undefined ) {
        throw new drefTemplateError('deref template incorrectly defined for ' + path.join('.'));
      }
      try {
        proxyParent[key] = obj.call ? obj.call(proxy, proxy) : (function(){
          return ud.method(proxy);
        })();
      }
      catch ( ex ) {
        if ( ex instanceof drefTemplateError ) {
          throw ex;
        }
        else {
          throw new drefTemplateError(ex + ' : deref template incorrectly defined for ' + path.join('.'));
        }
      }
    };

  })(),

  /**
   * In numerous instances it is a good idea to keep references to objects
   * but you may want to extend those objects. Deref does that by using
   * Object.create to create wrapped versions of those objects, so that
   * earlier properties are kept on the prototype chain, and new properties
   * remain local.
   *
   * @static
   * @method go.deref
   */
  deref: function(obj, template, method){
    var ret = Object.create(obj), createAssignableObject = this._createAssignableObject;
    template && go.walk(template, this._derefWithTemplate, true, ret, {
      method: method || createAssignableObject
    });
    return ret;
  },

  /**
   * By default deref uses Object.create() to dereference, but this can
   * cause issues if the objects you are using relies on any Own property methods.
   * In this case, use derefAssign, which instead of using the prototype chain,
   * uses Object.assign to create entirely new objects.
   *
   * @static
   * @method go.derefAssign
   */
  derefAssign: function(obj, template){
    var createAssignableObject = this._createAssignableObject;
    return this.deref(obj, template, function(obj){
      return Object.assign(createAssignableObject(obj), obj);
    });
  }

};

/**
 * ##### Why?
 *
 * When navigating a structure there are two factors that need to be taken
 * into account.
 *
 * The structure that describes the query, and the format of structure that
 * you are traversing.
 *
 * For example, here are some theoretical different ways to represent a similar query:
 *
 * 1. `['body', 'collideWorldBounds']`
 * 2. `body/collideWorldBounds`
 * 3. `[{"$key": 'body'}, {"$key", 'collideWorldBounds'}]`
 *
 * ... and some different ways to represent a parent and child structure:
 *
 * 1. `[ 'container', [ 'body', [ 'abc', ['collideWorldBounds', true] ] ] ]`
 * 2. `{ "container": { "body": { "collideWorldBounds": true } }`
 * 3. `<container><body><collideWorldBounds value="true" /></body></container>`
 *
 * This means that a system hoping to navigate in an open manner needs to be as extensible as possible.
 *
 * This is the aim of intrepid.js - to seperate the concerns of traversing data.
 *
 * ##### How?
 *
 * In order to achieve the required flexibility, everything had to be broken down into layers.
 *
 * Which would be obvious to any programmer worth their salt, but my previous attempts didn't
 * use enough layers.
 *
 * Currently intrepid is arrange with the following:
 *
 * 1. query layer - responsible for understanding the query structure
 * 2. intrepid layer - the outer api used by devs
 * 3. cursor layer - used internally by the intrepid object to go traverse the data
 * 4. target layer - used to wrap target object, adding useful behaviours that cursor uses
 * 5. join layer - used to keep track of the parent child relationship
 *
 * Out of the above, the query and reference layers are designed to be extended:
 *
 * 1. query layer supports .extend() so that different query languages can be used
 * 2. intrepid object supports .addHandler() which allows the addition of different intrepid reference handlers
 *
 * ##### Getting started
 *
 * This is just a simple library, with no dependencies, so it can be pulled in easily using:
 *
 *     npm install intrepid
 *
 * @namespace intrepid
 * @todo the design should not require filters to be functions, they could be strings or objects
 * currently however the handling is checking for .call on filters. This needs to change.
 */
var intrepid = function(){
  return intrepid.instance.create.apply(intrepid.instance, arguments);
};

/**
 * The base navigation object, this is extended by nearly all objects
 * used by the intrepid system.
 *
 * @namespace intrepid.base
 * @memberof intrepid
 */
intrepid.base = {

  /**
   * Create a new instance using Object.create()
   *
   * @memberof intrepid.base
   * @static
   * @chainable
   * @returns {intrepid.base}
   */
  create: function(target){
    return this.prep.apply(Object.create(this), arguments);
  },

  /**
   * Prepare each instance created by .create()
   *
   * @memberof intrepid.base
   * @instance
   * @chainable
   * @private
   */
  prep: function(){
    return this;
  },

  /**
   * Namespace this instance using the this.shared.namespaceTemplate as
   * instructions on what to dereference.
   *
   * @memberof intrepid.base
   * @instance
   * @chainable
   */
  namespace: function(){
    return go.derefAssign(this, this.shared && this.shared.namespaceTemplate);
  },

  /**
   * Extend this object with further properties and return a new reference
   *
   * @todo Currently depends on Object.assign, which needs a polyfill.
   * @requires Object.assign
   * @memberof intrepid.base
   * @instance
   * @chainable
   */
  extend: function(props){
    return Object.assign(Object.create(this), props || {});
  },

  /**
   * Return the prototype of this instance
   *
   * @todo Currently depends on Object.getPrototypeOf, which needs a polyfill.
   * @requires Object.getPrototypeOf
   * @memberof intrepid.base
   * @instance
   * @chainable
   */
  proto: function(){
    return Object.getPrototypeOf(this);
  },

  /**
   * Special method that collects configuration methods, those described
   * by this.shared.configMethods, and attaches them to a snowball object
   * this allows external objects to configure this one at a higher level.
   *
   * @param {Object} snowball - the object to add config methods to usually
   *                 passed in from a higher .config call
   * @param {Number} depth - the current depth of the config request
   *
   * @todo Currently depends on Object.assign, which needs a polyfill.
   * @requires Object.assign
   * @memberof intrepid.base
   * @instance
   * @chainable
   */
  config: function(snowball, depth){
    // at the first level, make sure we namespace, so that the new config
    // doesn't affect anything else.
    if ( !depth ) {
      // if snowball is passed as true, merge the config into this, rather than a sep. obj.
      return this.namespace().config(snowball === true ? this : {}, 1);
    }
    var keys, key, a, i, l, makeMethod = function(m, mc, rc){
      return function(){
        m.apply(mc, arguments);
        return rc;
      };
    };
    // add an end to the config.
    if ( !snowball.endConfig ) {
      snowball.endConfig = function(){ return this; };
      snowball.endConfig = snowball.endConfig.bind(this);
    }
    // each local configuration method, bind to this, and collect in snowball
    if ( this.shared && this.shared.configMethods ) {
      a = this.shared.configMethods; keys = Object.keys(a); i = 0; l = keys.length;
      for ( i; i<l; i++ ) {
        key = keys[i]; snowball[key] = makeMethod(this[key], this, snowball);
      }
    }
    // then for each helper, extend the snowball
    if ( this.helpers ) {
      a = this.helpers; keys = Object.keys(a); i = 0; l = keys.length;
      for ( i; i<l; i++ ) {
        key = keys[i]; a[key] && a[key].config && a[key].config(snowball, depth + 1);
      }
    }
    return snowball;
  }

};

/**
 * QueryInterface is the base object for any query interfaces.
 *
 * This object cannot be used directly as a Query, it has to be extended
 * so that its .process method can be defined.
 *
 * @example
 * var simpleQuery = intrepid.queryInterface.extend({
 *
 *   process: function(selector){
 *     var list = [];
 *     // cause any non-anchored selector to scan deep
 *     if ( selector[0] != '/' ) {
 *       selector.unshift('**');
 *     }
 *     for ( var i=0, a=selector, l=a.length; i<l; i++ ) {
 *       this.handleSegment(a[i], list);
 *     }
 *     return list;
 *   },
 *
 *   handleSegment: function(segment, list){
 *     switch ( segment ) {
 *       case '**':
 *         // this tells the navigator that it can free scan
 *         list.push( this.shared.segments.matchAnyAndNone );
 *       break;
 *       case '*':
 *         // this tells the navigator that it can wildcard match any at the current level
 *         list.push( this.shared.segments.matchAny );
 *       break;
 *       case '/':
 *         // this tells the navigator that it has to match the next item
 *         list.push( this.shared.segments.matchNext );
 *       break;
 *       case '..':
 *         // this tells the navigator to ascend, rather than descend, and match next
 *         list.push( this.shared.segments.matchParent );
 *         // after going backup, we need to go on down unless told otherwise
 *         list.push( this.shared.segments.goDescend );
 *       break;
 *       case '...':
 *         // this tells the navigator to ascend, rather than descend, and match any and none
 *         list.push( this.shared.segments.matchAncestor );
 *       break;
 *       default:
 *         switch ( true ) {
 *           default:
 *             item = function(val, key, par){ return key === segment; };
 *             item.toString = function(){
 *               return '[SimpleQuery Match ' + segment + ']';
 *             };
 *             list.push( item );
 *             // after a successful match, we should revert back to matchNext and descending
 *             list.push( this.shared.segments.matchNext );
 *             list.push( this.shared.segments.goDescend );
 *           break;
 *         }
 *       break;
 *     }
 *   }
 *
 * });
 *
 * @namespace intrepid.queryInterface
 * @memberof intrepid
 * @extends intrepid.base
 */
intrepid.queryInterface = intrepid.base.extend({

  /**
   * Shared object across all queryInterface instances of the same namespace
   *
   * @namespace intrepid.queryInterface.shared
   * @memberof intrepid.queryInterface
   */
  shared: {
  /**
   * Contains all the default segments, these are expected segments
   * that the navigation system needs to function.
   *
   * Default segments should retain the same references across namespaces
   * as the references themselves are used for camparion inside the
   * navigation code.
   *
   * @namespace intrepid.queryInterface.shared.segments
   * @memberof intrepid.queryInterface.shared
   */
    segments: {},
    /**
     * Namespace template used to create a new namespace. For QI it is
     * currently empty because everything can be left as shared refs.
     *
     * @memberof intrepid.queryInterface.shared
     * @type {Object}
     * @name namespaceTemplate
     */
    namespaceTemplate: {}
  },

  /**
   * Prepare each instance of queryInterface created by .create()
   *
   * @memberof intrepid.queryInterface
   * @instance
   * @chainable
   * @private
   */
  prep: function(selector){
    /**
     * `this.i` tracks internal information inside the object. There are a few reasons for
     * doing this. Please read about object reuse.
     *
     * @memberof! intrepid.queryInterface
     * @type {Object}
     * @instance
     * @private
     * @property {Number} current - tracks the current index within `this.i.segments`
     * @property {Array} segments - the list of segments
     */
    this.i = {};
    this.i.current = 0;
    this.i.segments = this.process(selector);
    return this;
  },

  /**
   * AndList
   *
   * @todo requires implementation, currently all segments are assumed to be linear,
   * and as such are applied one after the other. There needs to be support however for
   * parallel items either ANDs or ORs.
   * @memberof intrepid.queryInterface
   * @instance
   */
  __andList: function(){
    return [];
  },

  /**
   * OrList
   *
   * @todo requires implementation, currently all segments are assumed to be linear,
   * and as such are applied one after the other. There needs to be support however for
   * parallel items either ANDs or ORs.
   * @memberof intrepid.queryInterface
   * @instance
   */
  __orList: function(){
    return [];
  },

  /**
   * The method responsible for processing a selector into segments. Should return an array of
   *
   * an example implementation:
   *
   *     process: function(selector){
   *       var list = [];
   *       // cause any non-anchored selector to scan deep
   *       if ( selector[0] != '/' ) {
   *         selector.unshift('**');
   *       }
   *       for ( var i=0, a=selector, l=a.length; i<l; i++ ) {
   *         this.handleSegment(a[i], list);
   *       }
   *       return list;
   *     }
   *
   * @param {any} selector - usually selector is passed as a string, but could be any type
   *                         as long as the process function handles converting what it means into segments
   *
   * @returns {Array.<Function|intrepid.queryInterface.shared.segments.base>}
   * @memberof intrepid.queryInterface
   * @instance
   * @chainable
   */
  process: function(selector){
    throw new Error('This function should be overridden, and is responsible for returning an array of filter functions.');
  },

  /**
   * Reset the internal position within the segments
   *
   * @memberof intrepid.queryInterface
   * @instance
   * @chainable
   */
  reset: function(){
    this.i.current = 0;
    return this;
  },

  /**
   * Get the next segment, according to the current internal pointer `this.i.current`
   *
   * @returns {Function|intrepid.queryInterface.shared.segments.base}
   * @memberof intrepid.queryInterface
   * @instance
   * @chainable
   */
  next: function(){
    if ( this.i.current < this.i.segments.length ) {
      var item = this.i.segments[this.i.current];
      this.i.current++;
      return item;
    }
    else {
      return null;
    }
  },

  /**
   * Get the number of processed segments
   *
   * @memberof intrepid.queryInterface
   * @instance
   * @chainable
   */
  length: function(){
    return this.i.segments ? this.i.segments.length : 0;
  }

});

/*
 * Fixed segments, these are relied on by the navigation system
 */
(function(qi, segments){
  /**
   * This is the base segment, extended by all default segments
   *
   * @namespace intrepid.queryInterface.shared.segments.base
   * @memberof intrepid.queryInterface.shared.segments
   */
  segments.base = {
    /**
     * Allow this object to be extended by others
     *
     * @memberof intrepid.queryInterface.shared.segments.base
     * @instance
     */
    extend: function(props){
      return Object.assign(Object.create(this), props || {});
    }
  };
  /**
   * Extend matcher to create a new 'matcher' type. Matchers tell
   * the navigation system how they should match the next segment
   *
   * @namespace intrepid.queryInterface.shared.segments.matcher
   * @memberof intrepid.queryInterface.shared.segments
   * @extends intrepid.queryInterface.shared.segments.base
   */
  segments.matcher = segments.base.extend({});
  /**
   * Extend directive to create a new 'directive' type. Directives tell
   * the navigation system to perform an opteration.
   *
   * @namespace intrepid.queryInterface.shared.segments.directive
   * @memberof intrepid.queryInterface.shared.segments
   * @extends intrepid.queryInterface.shared.segments.base
   */
  segments.directive = segments.base.extend({});
  /**
   * Create a new instance of combination to create combinations of
   * matchers, directives and other combinations.
   *
   * @namespace intrepid.queryInterface.shared.segments.combination
   * @memberof intrepid.queryInterface.shared.segments
   * @extends intrepid.queryInterface.shared.segments.base
   */
  segments.combination = segments.base.extend({
    /**
     * Create a new instance of combination
     *
     * @static
     * @memberof intrepid.queryInterface.shared.segments.combination
     * @method
     */
    create: function(){
      return this.prep.apply(Object.create(this), arguments);
    },
    /**
     * Initialise each instance of `intrepid.queryInterface.shared.segments.combination`
     *
     * @private
     * @instance
     * @memberof intrepid.queryInterface.shared.segments.combination
     * @method
     */
    prep: function(items){
      this.i = {};
      this.i.list = items;
      return this;
    },
    /**
     * Apply the information that is contained in this combination using
     * the passed in method object.
     *
     * @instance
     * @memberof intrepid.queryInterface.shared.segments.combination
     * @method
     */
    apply: function(methods){
      for ( var a=this.i.list, i=0, l=a.length, item; i<l; i++ ) {
        item = a[i];
        if ( segments.directive.isPrototypeOf(item) ) {
          methods.setDirective(item);
        }
        else if ( segments.matcher.isPrototypeOf(item) ) {
          methods.setMatcher(item);
        }
        else if ( segments.combination.isPrototypeOf(item) ) {
          item.apply(methods);
        }
        else {
          methods.setSegment(item);
        }
      }
      return this;
    },
    /**
     * For each item in the combination, trigger a callback
     *
     * @instance
     * @memberof intrepid.queryInterface.shared.segments.combination
     * @method
     */
    each: function(callback, context){
      for ( var a=this.i.list, i=0, l=a.length; i<l; i++ ) {
        callback.call(context||this, a[i]);
      }
    },
    /**
     * Magic method to aid debugging.
     *
     * @instance
     * @memberof intrepid.queryInterface.shared.segments.combination
     * @method
     */
    toString: function(){
      return '[QueryInterface combination( ' + this.i.list + ' )]';
    }
  });
  /**
   * Tell if an object is a directive
   *
   * @memberof! intrepid.queryInterface
   * @name isDirective
   * @method
   * @instance
   */
  /**
   * Tell if an object is a directive
   *
   * @memberof intrepid.queryInterface
   * @name isDirective
   * @method
   * @static
   */
  qi.isDirective = function(v){ return segments.directive.isPrototypeOf(v); };
  /**
   * Tell if an object is a matcher
   *
   * @memberof! intrepid.queryInterface
   * @name isMatcher
   * @method
   * @instance
   */
  /**
   * Tell if an object is a matcher
   *
   * @memberof intrepid.queryInterface
   * @name isMatcher
   * @method
   * @static
   */
  qi.isMatcher = function(v){ return segments.matcher.isPrototypeOf(v); };
  /**
   * Tell if an object is a combianation
   *
   * @memberof! intrepid.queryInterface
   * @name isCombination
   * @method
   * @instance
   */
  /**
   * Tell if an object is a combination
   *
   * @memberof intrepid.queryInterface
   * @name isCombination
   * @method
   * @static
   */
  qi.isCombination = function(v){ return segments.combination.isPrototypeOf(v); };
  /**
   * A matcher that tells the navigator to match against the current targets, and further along
   *
   * @memberof intrepid.queryInterface.shared.segments
   * @extends intrepid.queryInterface.shared.segments.base
   * @name matchAnyAndNone
   * @type {Object}
   */
  segments.matchAnyAndNone = segments.matcher.extend({ toString: function(){ return '[QI matchAnyAndNone]'; } });
  /**
   * A matcher that tells the navigator to match the next item, and only the next
   *
   * @memberof intrepid.queryInterface.shared.segments
   * @extends intrepid.queryInterface.shared.segments.base
   * @name matchNext
   * @type {Object}
   */
  segments.matchNext = segments.matcher.extend({ toString: function(){ return '[QI matchNext]'; } });
  /**
   * A directive that tells the navigator to switch to descending i.e. navigating .children()
   *
   * @memberof intrepid.queryInterface.shared.segments
   * @extends intrepid.queryInterface.shared.segments.base
   * @name goDescend
   * @type {Object}
   */
  segments.goDescend = segments.directive.extend({ toString: function(){ return '[QI goDescend]'; } });
  /**
   * A directive that tells the navigator to switch to ascending i.e. navigating .parent()
   *
   * @memberof intrepid.queryInterface.shared.segments
   * @extends intrepid.queryInterface.shared.segments.base
   * @name goDescend
   * @type {Object}
   */
  segments.goAscend = segments.directive.extend({ toString: function(){ return '[QI goAscend]'; } });
  /**
   * A combination that tells the navigator to matchNext and then uses a filter than will match antyhing
   *
   * @todo the function on the end of this allows the parent match to actually match, needs refactoring.
   * @memberof intrepid.queryInterface.shared.segments
   * @extends intrepid.queryInterface.shared.segments.base
   * @name matchAny
   * @type {Object}
   */
  segments.matchAny = segments.combination.create([ segments.matchNext, function(v, k, p){ return true; } ]);
  /**
   * A combination that tells the navigator to ascend one and match any item there, which essential will select the parent
   *
   * @memberof intrepid.queryInterface.shared.segments
   * @extends intrepid.queryInterface.shared.segments.base
   * @name matchParent
   * @type {Object}
   */
  segments.matchParent = segments.combination.create([ segments.goAscend, segments.matchAny ]);
  /**
   * A combination that tells the navigator to switch to ascending and then to matchAnyAndNode, searching ancestors
   *
   * @memberof intrepid.queryInterface.shared.segments
   * @extends intrepid.queryInterface.shared.segments.base
   * @name matchAncestor
   * @type {Object}
   */
  segments.matchAncestor = segments.combination.create([ segments.goAscend, segments.matchAnyAndNone ]);

})(intrepid.queryInterface, intrepid.queryInterface.shared.segments);

/**
 * Data handlers allow the intrepid system to navigate different structures
 *
 * @namespace intrepid.dataHandlers
 * @memberof intrepid
 * @extends intrepid.base
 */
intrepid.dataHandlers = intrepid.base.extend({

  shared: {
    handlers: {
      byName: {},
      byList: [],
      inOrder: []
    },
    filtered: {
      byName: {},
      byList: [],
      inOrder: []
    },
    namespaceTemplate: {
      shared: {
        handlers: { byName: {}, byList: [], inOrder: [] },
        filtered: { byName: {}, byList: [], inOrder: [] },
        namespaceTemplate: {},
        configMethods: {}
      }
    },
    configMethods: {
      dataHandlers: true
    }
  },

  /**
   * By default, all dataHandlers are available and can be found
   * attached to the .shard.handlers object. These handlers manage
   * the order they are applied by their weight property.
   *
   * However, it is possible to configure the dataHandlers to use
   * on a per-instance basis. When doing this, the handlers should
   * be named in the order they should be applied.
   *
   * @todo dataHandlers probably should be renamed to avoid intrepid.dataHandlers.dataHandlers() or similar.
   * @memberof intrepid.dataHandlers
   * @instance
   */
  dataHandlers: function(names){
    var filtered = this.shared.filtered, handlers = this.shared.handlers;
    filtered.byName = {};
    filtered.byList = [];
    filtered.inOrder = [];
    if ( arguments.length > 1 ) { names = arguments; }
    else if ( typeof arguments[0] == 'string' ) { names = [arguments[0]]; }
    var a = names, i, l, name, handler;
    for ( i=0, l=a.length; i<l; i++ ) {
      if ( (name=a[i]) && handlers.byName[name] ) {
        handler = handlers.byName[name];
        filtered.byName[name] = handler;
        filtered.byList.push(handler);
        filtered.inOrder.push(handler);
      }
    }
    return this;
  },

  /**
   * List out the added handlers in order of their weight.
   *
   * @memberof intrepid.dataHandlers
   * @instance
   */
  getHandlersOrderedByWeight: function(){
    var a = this.shared.handlers.byList.slice(), i = 0, l = a.length;
    return a.sort(function(a, b){
      if ( a.weight > b.weight ) {
        return 1;
      }
      else if ( a.weight < b.weight ) {
        return -1;
      }
      else {
        return 0;
      }
    });
  },

  /**
   * A join is a special intrepid object that describes the link between two
   * objects. Usually used for parent->child relationships. You can access the
   * properties of a join using .from() .by() and .to() - in parent->child
   * from() would be the parent, by() would be the key, and to() would be the child.
   *
   * This is only required to be used if the datastructre you are parsing
   * has no official concept of parent->child.
   *
   * @memberof intrepid.dataHandlers
   * @instance
   */
  choose: function(ref){
    var s = this.shared, a = s.filtered.inOrder || s.handlers.inOrder,
        i = 0, l = a.length, r, item
    ;
    // scan each handler in order of weight (or filtered order)
    for ( i; i<l; i++ ) {
      if ( (item=a[i]).obj.validation(ref)> 0 ) {
        return item.obj;
      }
    }
    // return the last found
    return item.obj;
  },

  /**
   * Add a new handler, which can be referenced by name
   *
   * @example
   * intrepid.dataHandlers.add('empty-example', 500, {
   *
   *   validation: function(ref){},
   *
   *   hasAttributes: function(){},
   *   hasAttribute: function(){},
   *   attribute: function(){},
   *
   *   hasChildren: function(){},
   *   children: function(){},
   *
   *   hasParent: function(){},
   *   parent: function(){},
   *
   *   filter: function(){},
   *
   *   needsResolving: function(){},
   *   resolve: function(){},
   *
   *   processParents: function(){},
   *   processChildren: function(){},
   *
   * });
   *
   * @param {String} name
   * @param {Number} weight
   * @param {Object} obj
   * @memberof intrepid.dataHandlers
   * @instance
   */
  add: function(name, weight, obj){
    var item = {
      name: name,
      weight: weight,
      obj: obj
    };
    // TODO: faster, better, stronger
    obj.join = function(from, by, to){
      return new intrepid.join(from, by, to);
    };
    this.shared.handlers.byName[name] = item;
    this.shared.handlers.byList.push(item);
    this.shared.handlers.inOrder = this.getHandlersOrderedByWeight();
    return this;
  }

});

/**
 * Store the join between parent and child (or other things)
 *
 * @memberof intrepid
 * @constructor intrepid.join
 */
intrepid.join = function join(from, by, to){
  if ( this instanceof join ) {
    this.shared.store.set(this, {
      from: from,
      by: by,
      to: to
    });
    return this;
  }
  else {
    return new join(from, by, to);
  }
};
/**
 * Shared object between instances of intrepid.join
 *
 * @memberof intrepid.join
 */
intrepid.join.prototype.shared = { store: new WeakMap() };
/**
 * Return the from() part of the join, usually the parent.
 *
 * @memberof intrepid.join
 * @instance
 */
intrepid.join.prototype.from = function(){ return this.shared.store.get(this).from; };
/**
 * Return the by() part of the join, usually the key binding parent to child
 *
 * @memberof intrepid.by
 * @instance
 */
intrepid.join.prototype.by = function(){ return this.shared.store.get(this).by; };
/**
 * Return the to() part of the join, usually the child.
 *
 * @memberof intrepid.join
 * @instance
 */
intrepid.join.prototype.to = function(){ return this.shared.store.get(this).to; };
/**
 * Create a child join from this join
 *
 * @memberof intrepid.join
 * @instance
 */
intrepid.join.prototype.join = function(by, to){ return new intrepid.join(this, by, to); };
/**
 * Magic method to aid debugging.
 *
 * @memberof intrepid.join
 * @instance
 */
intrepid.join.prototype.toString = function(){
  return '[ intrepid Join ' + this.by() + ' ]';
};

/**
 * For each target, the handler used to navigate can be different
 * this is why we wrap each target in a targetReference instance.
 *
 * @namespace intrepid.targetReference
 * @extends intrepid.base
 * @memberof intrepid
 */
intrepid.targetReference = intrepid.base.extend({

  /**
   * Shared object across all targetReference instances of the same namespace
   *
   * @namespace intrepid.targetReference.shared
   * @memberof intrepid.targetReference
   *
   * @property {Object} namespaceTemplate - used to describe the properties
   *                    that will be dereference for a new namespace.
   */
  shared: {
    namespaceTemplate: {
      shared: {
        namespaceTemplate: {}
      },
      helpers: {
        dataHandlers: function(o){
          return o.namespace();
        }
      }
    }
  },

  /**
   * The helpers collection can be seen as a group of external dependencies.
   *
   * They are objects that the targetReference constructor relies on.
   *
   * They can be easily overridden on a per namespace basis. For example:
   *
   *     myNav = intrepid.namespace();
   *     myNav.helpers.cursorObject.helpers.dataHandlers = <replacement object goes here>;
   *
   * By namespacing you keep your changes from affecting the global object.
   *
   * @memberof intrepid.targetReference
   * @type {Object}
   * @property {intrepid.dataHandlers} dataHandlers - the interface used to access the added data handlers
   * @property {intrepid.join} join - the interface used to create join objects
   */
  helpers: {
    dataHandlers: intrepid.dataHandlers,
    join: intrepid.join
  },

  /**
   * Initialise the targetReference instance
   *
   * @memberof intrepid.targetReference
   * @instance
   * @private
   */
  prep: function(target, key, parent){
    this.i = {};
    if ( target instanceof this.helpers.join ) {
      this.i.join = target;
    }
    else {
      this.i.join = this.helpers.join(parent, key, target);
    }
    this.i.handler = this.helpers.dataHandlers.choose(this);
    return this;
  },

  /**
   * Each handler is responsible for returning the attribute. If supported.
   *
   * @memberof intrepid.targetReference
   * @instance
   */
  attribute: function(){
    if ( this.i.handler.hasAttributes(this) && this.i.handler.hasAttribute(this, filter) ) {
      var attr = this.i.handler.parent(this, filter);
      if ( attr ) {
        return this.create(attr);
      }
    }
    return null;
  },

  /**
   * Each handler is responsible for returning the matching attributes
   * as an array. If supported.
   *
   * @memberof intrepid.targetReference
   * @instance
   */
  attributes: function(){
    if ( this.i.handler.hasAttributes(this) ) {
      var attrs = this.i.handler.children(this, filter);
      if ( attrs && attrs.length ) {
        return this.wrap(attrs);
      }
    }
    return [];
  },

  /**
   * Each handler is responsible for returning an array of
   * objects. These can be direct child references, or they
   * can be instances of intrepid.pair
   *
   * @memberof intrepid.targetReference
   * @instance
   */
  children: function(filter){
    if ( this.i.handler.hasChildren(this) ) {
      var kids = this.i.handler.children(this, filter);
      if ( kids && kids.length ) {
        return this.wrap(kids);
      }
    }
    return [];
  },

  /**
   * The handler should return one object, the parent of the current target
   *
   * @memberof intrepid.targetReference
   * @instance
   */
  parent: function(filter){
    if ( this.i.handler.hasParent(this) ) {
      var parent = this.i.handler.parent(this, filter);
      if ( parent ) {
        return this.create(parent);
      }
    }
    return null;
  },

  /**
   * The handler should return the object, or false
   *
   * @memberof intrepid.targetReference
   * @instance
   */
  filter: function(filter){
    if ( this.i.handler.filter(this, filter) ) {
      return this;
    }
    return null;
  },

  /**
   * Test the object stored under .to() against a list of functions
   *
   * @memberof intrepid.targetReference
   * @instance
   */
  test: function(){
    var target = this.get();
    for ( var a=arguments, i=0, l=a.length; i<l; i++ ) {
      if ( a[i] && a[i].call && a[i](target) ) {
        return true;
      }
    }
    return false;
  },

  /**
   * get the data stored at .to()
   *
   * @memberof intrepid.targetReference
   * @instance
   */
  get: function(){
    return this.i.join.to();
  },

  /**
   * get the data stored at .by()
   *
   * @memberof intrepid.targetReference
   * @instance
   */
  getKey: function(){
    return this.i.join.by();
  },

  /**
   * get the data stored at .from()
   *
   * @memberof intrepid.targetReference
   * @instance
   */
  getParent: function(){
    return this.i.join.from();
  },

  /**
   *  A join helper, pass in a key and a child object, and you will be returned an instance of {@link intrepid.join}
   * using the current target as the parent.
   *
   * @memberof intrepid.targetReference
   * @instance
   */
  joinChild: function(by, to){
    return this.i.join.join(by, to);
  },

  /**
   * When items are returned by external code they can be
   * normal objects or they could be special intrepid instances
   * wrap just normalises the list, so that they are all represented
   * by instances of targetReference
   *
   * @memberof intrepid.targetReference
   * @instance
   */
  wrap: function(list){
    if ( !list ) return [];
    if ( is.array(list) ) {
      var relist = [], item;
      for ( var i=0, l=list.length; i<l; i++ ) {
        relist.push(this.wrapItem(list[i]));
      }
      return relist;
    }
    else {
      return [this.wrapItem(list)];
    }
  },

  /**
   * Wrap the individual items with `intrepid.targetReference`
   *
   * @memberof intrepid.targetReference
   * @instance
   */
  wrapItem: function(item){
    if ( this.isPrototypeOf(item) ) {
      return item;
    }
    else {
      return this.create(item);
    }
  }

});

/**
 * UniqueList behaves basically like a cut-down array (only supports push at the moment),
 * but only allows unique items.
 *
 * It does this using two methods. One for objects, and one for primive types. Objects
 * are tracked by reference using a WeakMap, primitives are matched by value.
 *
 * @todo needs to be finished, currently no tracking on removing of items.
 * @todo WeakMap requires a Polyfill, could be possible to switch to Map instead.
 * @namespace intrepid.uniqueList
 * @memberof intrepid
 */
intrepid.uniqueList = intrepid.base.extend({

  /**
   * Shared object across all uniqueList instances of the same namespace
   *
   * @namespace intrepid.uniqueList.shared
   * @memberof intrepid.uniqueList
   *
   * @property {Object} namespaceTemplate is used when creating a safe clone of this
   *                    object using .namespace() - the newly created object can then
   *                    be modified without fear of affecting other instances where it matters.
   *                    This template object should be extended (or replaced) if you
   *                    extend intrepid.instance, so that new namespaces know what references
   *                    need to be unique.
   *
   * @property {Object} config stores shared configuration for instances under the same namespace
   *
   * @property {Object} configMethods stores the keys of methods that can be collected to create a configuration API.
   */
  shared: {
    namespaceTemplate: {
      shared: {
        namespaceTemplate: {},
        config: {},
        configMethods: {}
      }
    },
    config: {
      comparisonEntity: function(v){
        return v;
      }
    },
    configMethods: {
      comparisonEntity: true
    }
  },

  /**
   * Create a new instance of uniqueList
   *
   * @memberof intrepid.uniqueList
   * @static
   */
  create: function(){
    return this.prep.apply(Object.create(this), arguments);
  },

  /**
   * Because WeakMap only supports objects, we have to store primitives separately
   *
   * @memberof intrepid.uniqueList
   * @instance
   * @private
   */
  prep: function(){
    this.i = {};
    this.i.items = [];
    this.i.comparisons = {
      objects: new WeakMap(),
      primitives: {
        keys: [],
        vals: []
      }
    };
    return this;
  },

  /**
   * Push a new item onto the uniqueList
   *
   * @memberof intrepid.uniqueList
   * @instance
   */
  push: function(v){
    var ce = this.shared.config.comparisonEntity(v);
    if ( ce === v ) {
      if ( this.i.items.indexOf(v) === -1 ) {
        this.i.items.push(v);
      }
    }
    else {
      if ( is.primitive(ce) ) {
        if ( this.i.comparisons.primitives.keys.indexOf(ce) === -1 ) {
          this.i.comparisons.primitives.keys.push(ce);
          this.i.comparisons.primitives.vals.push(this.i.items.length);
          this.i.items.push(v);
        }
      }
      else {
        if ( !this.i.comparisons.objects.has(ce) ) {
          this.i.comparisons.objects.set(ce, this.i.items.length);
          this.i.items.push(v);
        }
      }
    }
  },

  /**
   * Get an item at zero-based index n
   *
   * @memberof intrepid.uniqueList
   * @instance
   */
  get: function(n){
    if ( arguments.length ) {
      return this.i.items[n];
    }
    else {
      return this.i.items;
    }
  },

  /**
   * Configure the comparisonEntity method.
   *
   * The comparisonEntity method is used to determine what part of the
   * data - that the uniqueList is holding - is used in the comparions for uniqueness.
   *
   * By default the configured method just returns the passed in value.
   * Essentially meaning the comparison is run against the direct item passed
   * into the list.
   *
   * You can configure this method to do whatever you like, it could return some subset
   * of the data being tracked, or could use the data being tracked in some way to
   * return information to be compared against.
   *
   * Obviously all operations inside the method need to be synchronous.
   *
   * @memberof intrepid.uniqueList
   * @instance
   */
  comparisonEntity: function(m){
    this.shared.config.comparisonEntity = m;
    return this;
  }

});

/**
 * The Cursor layer maintains tracking the data references so that the
 * top level intrepid API can focus on how to navigate.
 *
 * ##### Layers
 *
 * Relationships between helper entities needs to be maintained in a relative
 * manor. There should be no global or top level references. This then allows
 * each layer to switch out what it is using.
 *
 * Each layer maintains references to the next, by way of its helpers.
 *
 *     +--------------------------------------------------+
 *     | Intrepid instance                                |
 *     | +----------------------------------------------+ |
 *     | | CursorObject                                 | |
 *     | | +-----------------+-----------------+--------| |
 *     | | | targetReference | targetReference | targetR| |
 *     | | | +-------------+ | +-------------+ | +------| |
 *     | | | | dataHandler | | | dataHandler | | | dataH| |
 *     | | | +-------------+ | +-------------+ | +------| |
 *     | | +-----------------------------------+--------| |
 *     | +----------------------------------------------+ |
 *     +-------------------------------------------------+
 *
 * This means however, that when there is a change in information. The
 * lower entities need to update. Rather than update however, it might
 * be best that the lower entities are just always referencing the
 * parent.
 *
 * @namespace intrepid.cursorObject
 * @memberof intrepid
 */
intrepid.cursorObject = intrepid.base.extend({

  /**
 * @namespace intrepid.cursorObject
 * @memberof intrepid
   */
  shared: {
    namespaceTemplate: {
      shared: {
        namespaceTemplate: {}
      },
      helpers: {
        targetReference: function(o){
          return o.namespace();
        }
      }
    },
    config: {
      allowDuplicates: false
    },
    configMethods: {
      allowDuplicates: true,
      disallowDuplicates: true
    }
  },

  helpers: {
    targetReference: intrepid.targetReference,
    uniqueList: intrepid.uniqueList.config()
      .comparisonEntity(function(v, list){
        if ( !v ) console.trace();
        return v.get();
      })
      .endConfig()
  },

  /**
   * @memberof intrepid.cursorObject
   * @instance
   * @chainable
   */
  allowDuplicates: function(){
    this.shared.config.allowDuplicates = true;
    return this;
  },

  /**
   * @memberof intrepid.cursorObject
   * @instance
   * @chainable
   */
  disallowDuplicates: function(){
    this.shared.config.allowDuplicates = false;
    return this;
  },

  /**
   * @memberof intrepid.cursorObject
   * @private
   */
  prep: function(){
    this.i = {};
    this.i.targets;
    return this;
  },

  /**
   * @memberof intrepid.cursorObject
   * @instance
   */
  chain: function(){
    var instance = this.create();
    instance.i.targets = this.i.targets;
    return instance;
  },

  /**
   * Internal method to decide between using normal arrays and {@link intrepid.uniqueLists}
   *
   * @memberof intrepid.cursorObject
   * @private
   */
  _createList: function(){
    if ( this.shared.config.allowDuplicates ) {
      return [];
    }
    else {
      return this.helpers.uniqueList.create();
    }
  },

  /**
   * Clear the internal targets
   *
   * @memberof intrepid.cursorObject
   * @private
   */
  empty: function(){
    this.i.targets = [];
    return this;
  },

  /**
   * Get the first target
   *
   * @memberof intrepid.cursorObject
   * @instance
   * @returns {intrepid.targetReference}
   *//**
   * Set the first target
   *
   * @param {Object} target
   *
   * @memberof intrepid.cursorObject
   * @instance
   * @chainable
   * @returns {intrepid.cursorObject} this instance of cursorObject
   */
  target: function(target){
    if ( arguments.length ) {
      this.i.targets = [this.helpers.targetReference.create(target)];
      return this;
    }
    else {
      return this.i.targets[0] || null;
    }
  },

  /**
   * Get the array of targets
   *
   * @memberof intrepid.cursorObject
   * @instance
   * @returns {Array.<intrepid.targetReference>}
   *//**
   * Set the list of targets
   *
   * @param {Array|intrepid.uniqueList} target
   *
   * @memberof intrepid.cursorObject
   * @instance
   * @chainable
   * @returns {intrepid.cursorObject} this instance of cursorObject
   */
  targets: function(targets){
    if ( arguments.length ) {
      if ( this.helpers.uniqueList.isPrototypeOf(targets) ) {
        targets = targets.get();
      }
      this.i.targets = this.helpers.targetReference.wrap(targets);
      return this;
    }
    else {
      return this.i.targets;
    }
  },

  /**
   * Modify the target list to track the children of the current selection
   *
   * @memberof intrepid.cursorObject
   * @instance
   * @chainable
   * @returns {intrepid.cursorObject} a new instance of cursorObject
   */
  children: function(filter){
    var a,i,l, aa, ii, ll, list = this._createList();
    for ( a=this.i.targets, i=0, l=a.length; i<l; i++ ) {
      aa = a[i].children(filter);
      for ( ii=0, ll=aa.length; ii<ll; ii++ ) {
        list.push(aa[ii]);
      }
    }
    return this.create().targets(list);
  },

  /**
   * Modify the target list to track the parents of the current selection
   *
   * @memberof intrepid.cursorObject
   * @instance
   * @chainable
   * @returns {intrepid.cursorObject} a new instance of cursorObject
   */
  parent: function(filter){
    var a,i,l, list = this._createList(), p;
    for ( a=this.i.targets, i=0, l=a.length; i<l; i++ ) {
      p =  a[i].parent(filter);
      p && list.push(p);
    }
    return this.create().targets(list);
  },

  /**
   * Filter the current targets
   *
   * @memberof intrepid.cursorObject
   * @instance
   * @chainable
   * @returns {intrepid.cursorObject} a new instance of cursorObject
   */
  filter: function(filter){
    var a,i,l, aa, ii, ll, list = this._createList(), f;
    for ( a=this.i.targets, i=0, l=a.length; i<l; i++ ) {
      f = a[i].filter(filter);
      f && list.push(f);
    }
    return this.create().targets(list);
  },

  /**
   * Get a target at a particular offset, and resolve to the object i.e. unwrap from targetReference.
   *
   * @memberof intrepid.cursorObject
   * @instance
   * @returns {mixed}
   */
  get: function(n){
    if ( arguments.length ) {
      if ( n < this.i.targets.length ) {
        return this.i.targets[n].get();
      }
      else {
        return null;
      }
    }
    else {
      return this.getArray();
    }
  },

  /**
   * Get the list of targets as an array, but unwrap them from their targetReferences first
   *
   * @memberof intrepid.cursorObject
   * @instance
   * @returns {Array.<mixed>}
   */
  getArray: function(){
    var a,i,l, list = [];
    for ( a=this.i.targets, i=0, l=a.length; i<l; i++ ) {
      list.push(a[i].get());
    }
    return list;
  },

  /**
   * Get the list of targets as an array, but unwrap them from their targetReferences first
   *
   * @memberof intrepid.cursorObject
   * @instance
   * @returns {Array.<mixed>}
   */
  add: function(item){
    if ( this.isPrototypeOf(item) ) {
      this.i.targets = this.i.targets.concat(item.i.targets);
    }
    return this;
  },

  /**
   * Return the number of current targets
   *
   * @memberof intrepid.cursorObject
   * @instance
   * @returns {Array.<mixed>}
   */
  length: function(){
    return this.i.targets ? this.i.targets.length : 0;
  }

});

/**
 * The actual instance creator for intrepid, when calling intrepid() the
 * .create method of this object is called.
 *
 * @namespace intrepid.instance
 * @memberof intrepid
 */
intrepid.instance = intrepid.base.extend({

  /**
   * Shared object across all intrepid instances of the same namespace
   *
   * @namespace intrepid.instance.shared
   * @memberof intrepid
   *
   * @property {Object} namespaceTemplate is used when creating a safe clone of this
   *                    object using .namespace() - the newly created object can then
   *                    be modified without fear of affecting other instances where it matters.
   *                    This template object should be extended (or replaced) if you
   *                    extend intrepid.instance, so that new namespaces know what references
   *                    need to be unique.
   */
  shared: {
    namespaceTemplate: {
      shared: {
        namespaceTemplate: {}
      },
      helpers: {
        queryInterface: function(o){
          return o.namespace();
        },
        cursorObject: function(o){
          return o.namespace();
        }
      }
    }
  },

 /**
  * The helpers collection can be seen as a group of external dependencies.
  *
  * They are objects that the intrepid constructor relies on.
  *
  * They can be easily overridden on a per namespace basis. For example:
  *
  *     myNav = intrepid.namespace();
  *     myNav.helpers.queryInterface = <replacement object goes here>;
  *
  * By namespacing you keep your changes from affecting the global object.
  *
  * Obviously, if you'd like to affect the global object, you can skip the `.namespace()` call, although this is ill-advised.
  *
  * @memberof intrepid.instance
  * @namespace intrepid.instance.helpers
  * @property {intrepid.queryInterface} queryInterface - the base interface used to create query interfaces
  * @property {intrepid.cursorObject} cursorObject - the object used to track internal data references
  */
  helpers: {
    queryInterface: intrepid.queryInterface,
    cursorObject: intrepid.cursorObject
  },

  /**
   * Prepare each instance created by .create()
   *
   * @memberof intrepid.instance
   * @instance
   * @chainable
   * @private
   * @returns {intrepid.instance} this instance of `intrepid.instance`
   */
  prep: function(target, options){
    this.i = {};
    this.prepCursor(target);
    this.prepChained(options);
    return this;
  },

  /**
   * Prep our internal cursor that will keep track of our targets
   * The cursor must always be a unique instance, so that when
   * setting `.target()` we do not affect other cursors elsewhere.
   *
   * @memberof intrepid.instance
   * @instance
   * @chainable
   * @private
   * @returns {intrepid.instance} this instance of `intrepid.instance`
   */
  prepCursor: function(target){
    if ( this.helpers.cursorObject.isPrototypeOf(target) ) {
      this.i.cursor = target;
    }
    else if ( target ) {
      this.i.cursor = this.helpers.cursorObject.create().target(target);
    }
    return this;
  },

  /**
   * The chained object allows properties set on a previous instance
   * follow on down the chain, to another chained instance.
   *
   * @memberof intrepid.instance
   * @instance
   * @chainable
   * @private
   * @returns {intrepid.instance} this instance of `intrepid.instance`
   */
  prepChained: function(options){
    var chained = this.i.chained = this.i.chained ? go.derefAssign(this.i.chained) : {};
    chained.handlers || (chained.handlers = []);
    chained.stored || (chained.stored = []);
    chained.options || (chained.options = {});
    options && go.merge(chained.options, options);
    return this;
  },

  /**
   * Mostly used internally to return a new instance, but one that retains
   * any information that should be kept alive between chain operations.
   * By default, the new instance will take the current cursor, but if a new
   * target is supplied, it will use that instead.
   *
   * It should be noted that creating a new instance from a cursor will
   * not dereference that cursor. So if providing a cursor, make sure to
   * handle the dereferencing yourself.
   *
   * @param target {any|intrepid.cursorObject} - the target object to select, or an instance of `helpers.cursorObject`
   *
   * @memberof intrepid.instance
   * @chainable
   * @instance
   * @returns {intrepid.instance} a new instance of `intrepid.instance`
   */
  chain: function(target){
    return this.create(target !== undefined ? target : this.i.cursor.chain());
  },

  /**
   * Extend this object with further properties and return a new instance
   *
   * @param {Object} prop - an object of properties to merge in
   *
   * @todo .chained needs to be handled, and currently isn't
   *
   * @memberof intrepid.instance
   * @chainable
   * @instance
   * @returns {intrepid.instance} a new instance of `intrepid.instance`
   */
  extend: function(props){
    var instance = Object.assign(Object.create(this), props || {});
    // @TODO: chained?
    // force the extended instance to be reset
    return instance.prep(null);
  },

  /**
   * Merge in addition options
   *
   * @todo: go.merge is defunct at the moment, because it is quite
   * large to import. It might be better to use Object.assign with a
   * poylfill.
   *
   * @param {Object} options - an object of properties
   *
   * @memberof intrepid.instance
   * @chainable
   * @instance
   * @returns {intrepid.instance} this instance of `intrepid.instance`
   *//**
   * Retrieve the current options object
   *
   * @returns {Object} the collected options in object form
   * @memberof intrepid.instance
   * @instance
   */
  options: function(){
    if ( arguments.length ) {
      go.merge(this.i.chained.options, arguments[0]);
      return this;
    }
    else {
      return this.chained.options;
    }
  },

  /**
   * @memberof intrepid.instance
   * @returns {intrepid.instance} this instance of `intrepid.instance`
   * @chainable
   * @instance
   */
  each: function(callback, context){
    this.i.cursor.each.apply(this.i.cursor, arguments);
    return this;
  },

  /**
   * @memberof intrepid.instance
   * @returns {intrepid.instance} a new instance of `intrepid.instance`
   * @chainable
   * @instance
   */
  children: function(filter){
    return this.chain(this.i.cursor.children(filter));
  },

  /**
   * @memberof intrepid.instance
   * @returns {intrepid.instance} a new instance of `intrepid.instance`
   * @chainable
   * @instance
   */
  parent: function(filter){
    return this.chain(this.i.cursor.parent(filter));
  },

  /**
   * Find items that match the selector downwards through the children.
   * This requires two things:
   *
   * 1. the selector is using the expected queryInterface
   * 2. a cursor that understands the current data exists
   *
   * @todo `applyCombination` and others need to be shared reference functions
   * @memberof intrepid.instance
   * @returns {intrepid.instance} a new instance of `intrepid.instance`
   * @chainable
   * @instance
   */
  find: function(selector){
    var cursor = this.i.cursor.chain(),
        segment = selector.reset(),
        qi = this.helpers.queryInterface,
        qis = qi.shared.segments,
        match = qis.matchAnyAndNone,
        method = qis.goDescend,
        finds,
        scout
    ;
    // @TODO: these need to be shared reference functions
    var applyCombination = function(s){
      s.apply({
        setMatcher: setMatcher,
        setDirective: setDirective,
        setSegment: setSegment // setSegment means this should probably be refactored
      });
    };
    var setDirective = function(s){ method = s; };
    var setMatcher = function(s){ match = s; };
    var setSegment = function(s){ segment = s; };
    // loop each segment
    while ( (segment=selector.next()) ) {
      // segments can be functions, or particular object references defined by QI
      // the cursor can behave differently depending on the segment type.
      if ( !segment.call ) {
        if ( qi.isCombination(segment) ) {
          // @NOTE: be aware, this can change segment to something else via setSegment
          // this is to handle matchers like matchAny
          applyCombination(segment);
        }
        else if ( qi.isDirective(segment) ) {
          setDirective(segment);
        }
        else if ( qi.isMatcher(segment) ) {
          setMatcher(segment);
        }
      }
      console.log('####', '' + segment, '' + match, '' + method);
      // if the segment isn't a function, loop back
      if ( !segment.call ) continue;
      // find can operate forwards or backwards and can work directly with the next
      // items or scan ahead.
      if ( method === qis.goDescend ) {
        if ( match === qis.matchAnyAndNone ) {
          // create a new cursor we can move ahead without effecting the current internal one
          scout = cursor.children();
          // remove the current targets in our collection cursor
          cursor.empty();
          // scout ahead down the child structure to find a match for the first selector segment
          do {
            finds = scout.filter(segment);
            //console.log(finds);
            finds.length() && cursor.add(finds);
            scout = scout.children(); // we don't filter the children, because we need to search the entire tree
          } while ( scout.length() );
        }
        else if ( match === qis.matchNext ) {
          // actually filter the current children because we have to matchNext
          cursor = cursor.children(segment);
        }
      }
      else if ( method === qis.goAscend ) {
        if ( match === qis.matchAnyAndNone ) {
          // create a new cursor we can move ahead without effecting the current internal one
          scout = cursor.parent();
          // remove the current targets in our collection cursor
          cursor.empty();
          // scout ahead down the child structure to find a match for the first selector segment
          do {
            finds = scout.filter(segment);
            //console.log(finds);
            finds.length() && cursor.add(finds);
            scout = scout.parent(); // we don't filter the children, because we need to search the entire tree
          } while ( scout.length() );
        }
        else if ( match === qis.matchNext ) {
          // actually filter the current parent because we have to matchNext
          cursor = cursor.parent(segment);
        }
      }
      // cursor should now contain any of the children that matched the current segment
      // loop back round for the next segment, that will be applied to the children of
      // the recently matched items.
    }
    return this.chain(cursor);
  },

  /**
   * Gets a targetted item at offset n
   *
   * @param {Number} n - zero-based offset of target to return
   *
   * @memberof intrepid.instance
   * @returns {any}
   * @instance
   */
  get: function(n){
    return this.i.cursor.get.apply(this.i.cursor, arguments);
  },

  /**
   * Function to help with debugging, directly logs all targets to console.
   *
   * @memberof intrepid.instance
   * @returns {intrepid.instance} this instance of `intrepid.instance`
   * @chainable
   * @instance
   */
  log: function(){
    console.log(this.get());
    return this;
  },

  /**
   * Returns the internal cursor, instance of {@link intrepid.cursorObject}
   *
   * @memberof intrepid.instance
   * @returns {intrepid.cursorObject}
   * @instance
   */
  getCursor: function(){
    return this.i.cursor;
  }

});

/**
 * This is a simple query language to get things started. I also
 * have a full-blown path query language implemented within my
 * theory.js lib which I'll port over here soon.
 *
 * For now this should show the concepts.
 *
 * The queryInterface is responsible for taking the selector
 * and converting it into an array of filter functions.
 *
 * This filter functions are then applied one by one to the targets
 * identified by the navigation code.
 *
 * @namespace intrepid.simpleQuery
 * @memberof intrepid
 */
intrepid.simpleQuery = intrepid.queryInterface.extend({

  /**
   * The process function for simpleQuery, takes an array selector of simple
   * items and converts them into filter functions, matchers and directives
   * that the navigation system will understand.
   *
   * @memberof intrepid.simpleQuery
   * @instance
   */
  process: function(selector){
    var list = [];
    // cause any non-anchored selector to scan deep
    if ( selector[0] != '/' ) {
      selector.unshift('**');
    }
    for ( var i=0, a=selector, l=a.length; i<l; i++ ) {
      this.handleSegment(a[i], list);
    }
    return list;
  },

  /**
   * Example on how to define filter functions, and to use matchers and directives
   * to alter the way the navigation is occuring. This is because come query segments
   * are just for matching, whereas others do not match, intead they infer some alteration
   * to behaviour. E.g. 'tag-name' will just match, where as '..' will infer a change in
   * direction, and a direct next match.
   *
   * @memberof intrepid.simpleQuery
   * @instance
   */
  handleSegment: function(segment, list){
    switch ( segment ) {
      case '**':
        // this tells the navigator that it can free scan
        list.push( this.shared.segments.matchAnyAndNone );
      break;
      case '*':
        // this tells the navigator that it can wildcard match any at the current level
        list.push( this.shared.segments.matchAny );
      break;
      case '/':
        // this tells the navigator that it has to match the next item
        list.push( this.shared.segments.matchNext );
      break;
      case '..':
        // this tells the navigator to ascend, rather than descend, and match next
        list.push( this.shared.segments.matchParent );
        // after going backup, we need to go on down unless told otherwise
        list.push( this.shared.segments.goDescend );
      break;
      case '...':
        // this tells the navigator to ascend, rather than descend, and match any and none
        list.push( this.shared.segments.matchAncestor );
      break;
      default:
        switch ( true ) {
          case (segment.charAt(0) == '@'):



          break;
          default:
            var item = function(val, key, par){ return key === segment; };
            item.toString = function(){
              return '[SimpleQuery Match ' + segment + ']';
            };
            list.push( item );
            // after a successful match, we should revert back to matchNext and descending
            list.push( this.shared.segments.matchNext );
            list.push( this.shared.segments.goDescend );
          break;
        }
      break;
    }
  }

});

/**
 * This is a fake namespace, it doesn't actually exist in the codebase.
 *
 * It is here so as to document the comments for the internal extensions
 * that come with Intrepid, but that may not have an external access point.
 *
 * @namespace examples
 *//**
 * This is a fake namespace, it doesn't actually exist in the codebase.
 *
 * It is here so as to document the comments for the internal data handlers
 * that come with Intrepid.
 *
 * These handlers can be used by configuring an Intrepid instance, for example:
 *
 *     var egNav = intrepid()
 *       .config()
 *         .dataHandlers('obj')
 *       .endConfig()
 *     ;
 *
 * @namespace examples.dataHandlers
 */
/**
 * ##### About the 'obj' data handler
 *
 * A simple handler to traverse normal javascript objects, if they
 * don't have any formatted structure. You can configure to use only
 * this handler by doing:
 *
 *     var nav = intrepid()
 *       .config()
 *         .dataHandlers('obj')
 *       .endConfig()
 *     ;
 *
 * Intrepid already ships with an instance that does this however, in the shape of `intrepid.objNav`
 *
 * Data Handlers for Intrepid are just a collection of methods attached to an object,
 * using particular naming conventions. All methods are treated as static and shared
 * between all instances of data.
 *
 * This dataHandler treats structure in the following way:
 *
 * 1. Any key whose value is not-primitive i.e. an Object is treated as a Child.
 * 2. Any key whose value is primitive i.e. string, number, ... is treated as an Attribute.
 * 3. Parents are tracked as children are navigated, so no formal parent reference is needed.
 *
 * The signature of the .dataHandlers.add is (name, weight, method).
 * Where a larger number in weight means this is checked against a
 * target object later than a lower weight. This is so that new
 * additions can be placed higher and take over from default
 * handlers.
 *
 * @namespace examples.dataHandlers.obj
 */
intrepid.dataHandlers.add('obj', 1000, {
  /**
   * The valifation method is called on each possible target. The first
   * valifation function to return true is the dataHandler that is used
   * for that target.
   *
   * @param {intrepid.targetReference} ref - all targets are wrapped with targetReference,
   *        to gain access to that actual target use .get(), to get its key use
   *        .getKey() and to get its parent use .getParent()
   * @returns {Boolean}
   *
   * @memberof examples.dataHandlers.obj
   */
  validation: function(ref){
    // validate what type of object this handler should run for
    return (typeof ref.get() == 'object') && 1;
  },
  /**
   * In most cases filters are functions, provided by the QueryInterface, but
   * there isn't anything stopping the system from using something else as a filter.
   * This is why this method is provided. It is called whenever a filter operation
   * is requested. It is responsible for "filtering" the current ref against the filter.
   *
   * @param {intrepid.targetReference} ref
   * @param {mixed} filter
   * @returns {Boolean}
   *
   * @memberof examples.dataHandlers.obj
   */
  filter: function(ref, filter){
    return filter(ref.get(), ref.getKey(), ref.getParent());
  },
  /**
   * Called whenever there is need for an attribute check. In terms of standard js
   * objects, attributes can be counted as being non-object or non-array properties
   *
   * @param {intrepid.targetReference} ref
   * @param {string} attr
   * @returns {Boolean}
   *
   * @memberof examples.dataHandlers.obj
   */
  hasAttribute: function(ref, attr, valuehj){

  },
  /**
   * Called when an attribute
   *
   * @memberof examples.dataHandlers.obj
   */
  attribute: function(ref, attr, value){

  },
  /**
   * Detect if the current targets have children, in terms of js objects
   * this means the value is an object or array with content
   *
   * @param {intrepid.targetReference} ref
   * @returns {Boolean}
   *
   * @memberof examples.dataHandlers.obj
   */
  hasChildren: function(ref){
    if ( ref.test(is.object, is.array) ) {
      return Object.keys(ref.get()).length;
    }
    else {
      return false;
    }
  },
  /**
   * step each targetted item, find its children, and return an optionally filtered array of objects
   *
   * The returned objects can be the target children themselves, or instances of {@link intrepid.join}
   *
   * If requiring joins, use the {@link intrepid.targetReference#joinChild} helper, rather than creating directly.
   * This will handle linking to the current parent. You will find this method available via `ref.joinChild()`
   *
   * You can also return {@link intrepid.targetReference} instances, although in most places you
   * shouldn't need to create {@link intrepid.targetReference} instances directly.
   *
   * @param {intrepid.targetReference} ref - the wrapped target item to find children on
   * @param {Function} [filter] - optional filter function to filter the child items by
   * @returns {Array.<Object|intrepid.targetReference|intrepid.join>}
   *
   * @memberof examples.dataHandlers.obj
   */
  children: function(ref, filter){
    if ( ref.test(is.object, is.array) ) {
      var target = ref.get(), keys = Object.keys(target), i, l = keys.length, list = [], key, val;
      for ( i=0; i<l; i++ ) {
        key = keys[i];
        val = target[key];
        if ( !filter || filter(val, key) ) {
          list.push(ref.joinChild(key, val));
        }
      }
      return list;
    }
    else if ( ref.test(is.primitive) ) {
      return [];
    }
    else {
      return [];
    }
  },

  /**
   * Determine if the object supports parent handling, return false otherwise
   *
   * @memberof examples.dataHandlers.obj
   */
  hasParent: function(ref){
    //
    return !!ref.getParent();
  },
  /**
   * Called when attempting to access the parent
   *
   * For this data structure type, `ref.getParent()` will only work if `.children()` has correctly
   * supported things using this.join()
   *
   * @memberof examples.dataHandlers.obj
   */
  parent: function(ref){
    return ref.getParent();
  },

  // certain objects need to be resolved into something else first, if no
  // resolving is required, just return false
  needsResolving: function(){},
  resolve: function(){},

  processParents: function(){},
  processChildren: function(){}

});

/*
 * Create a navigator designed to navigate HTML
 */
intrepid.dataHandlers.add('dom', 500, {

  validation: function(ref){
    var o = ref.get(); return (o && o.nodeName ? 1 : 0);
  },

  matchKey: function(){},
  matchValue: function(){},
  matchAttr: function(){},
  hasChildren: function(){},
  children: function(){},
  filter: function(){},
  hasParent: function(){},
  parent: function(){},
  needsResolving: function(){},
  resolve: function(){},
  processParents: function(){},
  processChildren: function(){}

});

// a simple nav object
intrepid.objNav = intrepid().config().dataHandlers('obj').disallowDuplicates().endConfig();

return (exports.intrepid = intrepid);

}))); // end export
/*
// set-up hidden extra
var b=document.body, c=document.createElement('canvas'), a=c.getContext('2d'); document.documentElement.appendChild(c);
// start 1Kb
d=document;l='length';z=0;y='fillStyle';v=10;w=500;P={x:0,y:0,h:0,v:0,s:1};K={};L=[];n='';m=Math;A=m.abs;r='return ';f='function (',F=function(_,$){return eval('_='+f+($?_.split(n):n)+'){'+($?$:_)+'}')};S=[];Q=F('bc','c=m.random();'+r+'(b[l]?b[m.floor(b[l]*c)]:c*b)');T=F('bcdef','a.font=(f?f:1)+"em arial";a[y]=e;a.fillText(b,c,d);');M=F('O','g=a.getImageData(O.x+v,O.y,1,1);(g.data[2]?O.v=-2:n);(O.v<9?O.v+=0.3:n);O.y+=O.v;O.x+=O.h;(O.y>w?O.v=-O.v/2:n);O.y=m.min(O.y,w+v)');K=F('Oi','(A(O.x-5-P.x)<12&&A(O.y-P.y)<8?(S[i]=n)|z++:n)');C=F('bcdef','a[y]=f;a.fillRect(b,c,d,e);');P.x=Q(w);P.y=Q(w);c.width=c.height=w;setInterval(F('b=(K[68]?1:(K[65]?-1:0));(b&A(P.h)<4?P.h+=1*b:P.h/=1.5);(P.s==1&&K[87]?P.v=-5:n);M(P);C(0,0,w,w,"#000");T("☻",P.x,P.y,"#0A0",1.5);T(z,v,20);for(i=20;i--;){(!L[0]?L[i]=["☁",Q(w),Q(w),"#fff",Q(4)+2]:n);T.apply(n,L[i])};for(i=v;i--;){s=(!S[i]?S[i]={i:Q("★♥"),x:Q(w-v),y:0,h:0,v:0}:S[i]);M(s);K(s,i);T(s.i,s.x,s.y,"#fd0")}'),25);d.onkeydown=d.onkeyup=F('e','K[e.keyCode]=(e.type[l]==7);'+r+'0');
// end 1Kb
*/