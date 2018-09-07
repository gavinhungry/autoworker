class AutoWorker {
  constructor(fn) {
    let blob = new Blob([`
      self.addEventListener('message', async ({ data: { id, args }}) => {
        let fn = ${fn.toString()};

        try {
          let [ response ] = await Promise.all([fn(...args)]);
          self.postMessage({ id, response });
        } catch(err) {
          self.postMessage({ id, error: {
            message: err.message,
            stack: err.stack
          }
        });
        }
      });
    `], { type: 'application/javascript' });

    let url = URL.createObjectURL(blob);
    this.worker = new Worker(url);
  }

  /**
   * Get a unique ID string
   *
   * @param {Number} len - output string length
   * @return {String}
   */
  static generateId(len = 16) {
    return Array.from(crypto.getRandomValues(new Uint8Array(len)))
      .map(v => String.fromCharCode((Math.floor(v % 26) + 97))).join('');
  }

  run(...args) {
    return new Promise((resolve, reject) => {
      let messageId = AutoWorker.generateId();

      this.worker.addEventListener('message', ({ data: {
        id, error, response
      }}) => {
        if (id !== messageId) {
          return;
        }

        if (error) {
          let err = new Error(error.message);
          err.stack = error.stack;

          return reject(err);
        }

        resolve(response);
      });

      this.worker.postMessage({ id: messageId, args });
    });
  }
}

module.exports = AutoWorker;
