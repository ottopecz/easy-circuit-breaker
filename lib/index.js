const defaults = {
  "thresholdNum": 1,
  "thresholdErrType": Error,
  "thresholdErrMsg": new RegExp(),
  "interval": 30000
};

module.exports = {
  trap(arg1, arg2) {

    let callable;
    let healthCheck;
    let interval = defaults.interval;
    let circuitOpen = false;
    let errors = [];
    const threshold = {
      "num": defaults.thresholdNum,
      "errType": defaults.thresholdErrType,
      "errMsg": defaults.thresholdErrMsg
    };
    let timer;

    if (typeof arg1 === "function") {
      callable = arg1;
    } else if (
      typeof arg1 !== "boolean" &&
      typeof arg1 !== "string" &&
      typeof arg1 !== "number" &&
      typeof arg2 === "string"
    ) {
      callable = arg1[arg2];
    } else {
      throw new TypeError("The parameter has to be either a function or a method");
    }

    function isThresholdReached() {

      const tripErrors = errors.map(value => {

        if (value.constructor === threshold.errType && threshold.errMsg.test(value.message)) {
          return value;
        }
      });

      return (tripErrors.length >= threshold.num);
    }

    function fallback() {

      return new Promise(resolve => setImmediate(() => resolve("The circuit is open")));
    }

    function timerCallback() {

      healthCheck()
        .then(() => {

          clearInterval(timer);
          timer = null;
          circuitOpen = false;
        });
    }

    return {
      exec(...args) {

        if (isThresholdReached()) {

          errors = [];
          circuitOpen = true;
        }

        if (circuitOpen) {

          if (healthCheck && !timer) {

            timer = setInterval(() => timerCallback(), interval);
          }

          return fallback();
        }

        return new Promise((resolve, reject) => { // Returns a standard native promise

          callable(...args)
            .then(result => {

              resolve(result);
            }, err => {

              errors.push(err);
              reject(err);
            });
        });
      },
      setThresholdNum(thresholdNum) {

        if (typeof thresholdNum !== "number") {

          throw new TypeError("The parameter has to be a number");
        }

        if (thresholdNum < 0) {

          throw new RangeError("The parameter has to be greater or equal to 0");
        }

        threshold.num = thresholdNum;
        return this;
      },
      setThresholdErrType(thresholdErrType) {

        if (
          thresholdErrType !== Error &&
          thresholdErrType !== TypeError &&
          thresholdErrType !== RangeError &&
          Reflect.getPrototypeOf(thresholdErrType) !== Error &&
          Reflect.getPrototypeOf(thresholdErrType) !== TypeError &&
          Reflect.getPrototypeOf(thresholdErrType) !== RangeError
        ) {

          throw new TypeError("The parameter has to be an error type");
        }

        threshold.errType = thresholdErrType;
        return this;
      },
      setThresholdErrMsg(thresholdErrMsg) {

        if (!(thresholdErrMsg instanceof RegExp)) {
          throw new TypeError("The parameter has to be a regular expression");
        }

        threshold.errMsg = thresholdErrMsg;
        return this;
      },
      setHealthCheck(hcArg1, hcArg2, hcArg3) {

        if (typeof hcArg1 === "function") {

          healthCheck = hcArg1;
          interval = hcArg2;
        } else if (
          typeof hcArg1 !== "boolean" &&
          typeof hcArg1 !== "string" &&
          typeof hcArg1 !== "number" &&
          typeof hcArg2 === "string"
        ) {

          healthCheck = hcArg1[hcArg2];
          healthCheck.bind(hcArg1);
          interval = hcArg3;
        } else {

          throw new TypeError("The parameter has to be either a function or a method");
        }

        if (
          (interval ||
          (interval === 0)) &&
          (typeof interval === "number")
        ) {

          return this;
        }

        throw new TypeError("Health check interval should be set as number");
      }
    };
  }
};
