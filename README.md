autoworker
==========
Web Workers the Easy Way (TM).

No dependencies, only 686 bytes when minified and gzipped.

Define workers in-code or from a separate file, and work with promises to get
the results.

Installation
------------

### ES6 Module

```js
import AutoWorker from 'autoworker';
```

### Browserify

```sh
$ browserify autoworker.js --standalone AutoWorker -o autoworker-browser.js
```

Usage
-----

### Single method

If only a single method is provided, it is exposed on the instance as `run`.

```js
let worker = new AutoWorker((a, b, c) => {
  console.log('Calculating in a different thread!');

  return a + b + c;
});

await worker.run(5, 10, 15); // 30
```

### Multiple methods

> Note: Multiple methods on a single `AutoWorker` share the same `Worker`
> thread, so there is no concurrency (nor is there any concurrency for multiple
> calls to the same method).

```js
let worker = new AutoWorker({
  // destructure arguments from a single object
  sum: ({ a, b, c }) => a + b + c,

  // methods can be async as needed
  asyncProduct: async (a, b, c) => a * b * c
});

await worker.sum({ a: 1, b: 2, c: 3 }); // 6
await worker.asyncProduct(2, 4, 8); // 64
```

### exec

Methods can also be called by name with `exec`:

```js
await worker.exec('asyncProduct', 2, 4, 8); // 64
```

### Errors

When errors are caught while running methods, the promise is rejected:

```js
let worker = new AutoWorker({
  throws: () => { throw new Error('OHNO'); }
});

try {
  await worker.throws();
} catch(err) {
  // Error: OHNO
}
```

### Separate files

Since workers execute in a different thread, it can be confusing to see their
definitions in-code. To keep your workers in separate files:

`sum.js`:
```js
export default (a, b, c) => a + b + c;
```

```js
import sum from './sum.js';
let worker = new AutoWorker(sum);
```

License
-------
This software is released under the terms of the **MIT license**. See `LICENSE`.
