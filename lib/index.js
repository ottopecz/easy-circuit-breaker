const defaults = {
  "thresholdNum": 1,
  "thresholdErrType": Error,
  "thresholdErrMsg": new RegExp(),
  "interval": 30000
};

module.exports = {
  trap(callable) {

    return {
      "_circuitOpen": false,
      "_errors": [],
      "_threshold": {
        "num": defaults.thresholdNum,
        "errType": defaults.thresholdErrType,
        "errMsg": defaults.thresholdErrMsg
      },
      "_interval": defaults.interval,
      _isThresholdReached() {

        const tripErrors = this._errors.map(value => {

          if (value.constructor === this._threshold.errType && this._threshold.errMsg.test(value.message)) {
            return value;
          }
        });

        return (tripErrors.length >= this._threshold.num);
      },
      _fallback() {

        return new Promise(resolve => setImmediate(() => resolve("The circuit is open")));
      },
      _timerCallback() {

        this._healthCheck()
          .then(() => {
            clearInterval(this._timer);
            this._timer = null;
            this._circuitOpen = false;
          }, err => {
            console.lerr("Remote i/o is not healthy", err);
          });
      },
      exec(...args) {

        if (this._isThresholdReached()) {

          this._errors = [];
          this._circuitOpen = true;
        }

        if (this._circuitOpen) {

          if (this._healthCheck && !this._timer) {

            this._timer = setInterval(() => this._timerCallback(), this._interval);
          }

          return this._fallback();
        }

        return new Promise((resolve, reject) => { // Returns a standard native promise

          callable(...args)
            .then(result => {

              resolve(result);
            }, err => {

              this._errors.push(err);
              reject(err);
            });
        });
      },
      setThresholdNum(thresholdNum) {

        this._threshold.num = thresholdNum;
        return this;
      },
      setThresholdErrType(thresholdErrType) {

        this._threshold.errType = thresholdErrType;
        return this;
      },
      setThresholdErrMsg(thresholdErrMsg) {

        this._threshold.errMsg = thresholdErrMsg;
        return this;
      },
      setHealthCheck(ctx, method, interval) {

        // @todo Making possible to handle function not only method

        this._healthCheck = ctx[method];
        this._healthCheck.bind(ctx);

        /* eslint-disable no-undefined */
        if (interval !== undefined || interval !== null) {
          /* eslint-enable no-undefined */
          this._interval = interval;
        }
        return this;
      }
    };
  }
};
