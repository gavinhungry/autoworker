/*
 * autoworker - Web Workers the Easy Way (TM)
 * https://github.com/gavinhungry/autoworker
 */

class AutoWorker {
  /**
   * Create an AutoWorker instance
   *
   * @param {Object | Function} methods - if function, method name is 'run'
   * @return {AutoWorker}
   */
  constructor(methods) {
    if (typeof methods === 'function') {
      methods = { run: methods };
    }

    let names = Object.keys(methods);

    let handler = () => {
      self.addEventListener('message', async ({ data }) => {
        try {
          let fn = methods[data.name];

          // use Promise.all, so our functions can optionally be async
          let [ result ] = await Promise.all([fn(...data.args)]);
          self.postMessage({ id: data.id, result });
        } catch(err) {
          // we can't send back the entire Error object, so pick properties
          self.postMessage({ id: data.id, error: {
            message: err.message,
            stack: err.stack
          }});
        }
      });
    };

    let blob = new Blob([
      'const methods = {};',
      ...names.map(name => `methods['${name}'] = ${methods[name]};`),
      'Object.freeze(methods);',

      `(${handler})();`
    ], { type: 'application/javascript' });

    let url = URL.createObjectURL(blob);
    this._worker = new Worker(url);

    // add helper instance methods for each named worker method
    names.forEach(name => {
      if (!this[name]) {
        this[name] = (...args) => this._exec(name, ...args);
      }
    });
  }

  /**
   * Get a unique ID string
   *
   * @param {Number} length - output string length
   * @return {String}
   */
  static generateId(length = 16) {
    return Array.from(crypto.getRandomValues(new Uint8Array(length)))
      .map(v => String.fromCharCode((Math.floor(v % 26) + 97))).join('');
  }

  /**
   * Get the results of a named method executed in the worker thread
   *
   * @private
   *
   * @param {String} name - method name
   * @param {...Mixed} args - method arguments
   * @return {Promise} method results
   */
  _exec(name, ...args) {
    return new Promise((resolve, reject) => {
      let id = AutoWorker.generateId();

      this._worker.addEventListener('message', ({ data }) => {
        // this result is not for us
        if (data.id !== id) {
          return;
        }

        if (data.error) {
          let err = new Error(data.error.message);
          err.stack = data.error.stack;

          return reject(err);
        }

        resolve(data.result);
      });

      this._worker.postMessage({ id, name, args });
    });
  }
}

module.exports = AutoWorker;
