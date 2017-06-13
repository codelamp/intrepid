# Intrepid

## Overview

This is a simple utility for navigating structures, it has been broken off from my Theory lib, because it was complex enough to stand alone, and is still in progress.

For now there is only a simple Query language available via `intrepid.simpleQuery` but there will be more to follow shortly, like the Object Path Notation that theory was developing.

## Example usage

I yet to fully develop the API yet, so for now I'm leaving the barebones objects i.e. like `intrepid.simpleQuery` to be referenced. Later on it should be possible to create an intrepid instance that will have the type of query and data handlers paired together. Making the interface more succinct.

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

## Documentation

For now the documentation can be found here, it is a work in progress, so please bear with me.

[http://codelamp.github.io/intrepid/html/intrepid.html](http://codelamp.github.io/intrepid/html/intrepid.html)

## Local development

### Building docs

The documentation is powered by jsdoc, so you will need to install the dev dependencies via npm. Once that's done, you can build using:

    npm run make-docs
