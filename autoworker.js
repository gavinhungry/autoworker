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

    let handler = methods => {
      self.addEventListener('message', async ({ data }) => {
        try {
          let method = methods[data.methodName];
          let result = await method(...data.args);

          self.postMessage({
            id: data.id,
            result
          });
        } catch(err) {
          // we can't send back the entire Error object, so pick properties
          self.postMessage({
            id: data.id,
            error: {
              message: err.message,
              stack: err.stack
            }
          });
        }
      });
    };

    let blob = new Blob([
      `(${handler})(Object.freeze({`,
        ...Object.keys(methods).map(methodName => {
          let method = methods[methodName];

          if (typeof method === 'function') {
            return `"${methodName}": ${method}`;
          }
        }),
      '}));'
    ], { type: 'application/javascript' });

    let url = URL.createObjectURL(blob);
    this._worker = new Worker(url);

    // add helper instance methods for each named worker method
    Object.keys(methods).forEach(methodName => {
      if (!this[methodName]) {
        this[methodName] = (...args) => this._exec(methodName, ...args);
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
   * @param {String} methodName
   * @param {...Mixed} args - method arguments
   * @return {Promise} method results
   */
  _exec(methodName, ...args) {
    let id = AutoWorker.generateId();

    setTimeout(() => {
      this._worker.postMessage({
        id,
        methodName,
        args
      });
    });

    return new Promise((resolve, reject) => {
      let callback = ({ data }) => {
        // this result is not for us
        if (data.id !== id) {
          return;
        }

        this._worker.removeEventListener('message', callback);

        if (data.error) {
          let err = new Error(data.error.message);
          err.stack = data.error.stack;

          return reject(err);
        }

        resolve(data.result);
      };

      this._worker.addEventListener('message', callback);
    });
  }
}

module.exports = AutoWorker;
