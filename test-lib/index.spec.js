const {expect} = require("code");
const Lab = require("lab");
const {stub, spy} = require("sinon");
const Q = require("q");
const circuitBreaker = require("../lib/index");
const {describe, it} = exports.lab = Lab.script();

describe("The \"circuitBreaker\" namespace", () => {

  it("should have a method \"trap\"", done => {

    expect(circuitBreaker).to.only.include("trap");
    expect(circuitBreaker.trap).to.be.a.function();
    done();
  });
});

describe("The \"trap\" method", () => {

  describe("when it's called with a function(callable) target", () => {

    it("should return a proxy object", done => {

      const proxy = circuitBreaker.trap(function callable() {});

      expect(proxy).to.be.an.object();
      done();
    });
  });

  describe("when it's called with a method(callable) target", () => {

    const target = {callable() {}};

    it("should return a proxy object", done => {

      const proxy = circuitBreaker.trap(target.callable);

      expect(proxy).to.be.an.object();
      done();
    });
  });

  describe("when it's called with a method(callable, instance \"methodName\" notation) target", () => {

    const target = {callable() {}};

    it("should return a proxy object", done => {

      const proxy = circuitBreaker.trap(target, "callable");

      expect(proxy).to.be.an.object();
      done();
    });
  });

  describe("when it's called with an object(non-callable) target", () => {

    const target = {};

    it("should throw a type error", done => {

      expect(() => circuitBreaker.trap(target)).to.throw(TypeError,
        "The parameter has to be either a function or a method");
      done();
    });
  });

  describe("when it's called with a string(non-callable) target", () => {

    const target = "target";

    it("should throw a type error", done => {

      expect(() => circuitBreaker.trap(target)).to.throw(TypeError,
        "The parameter has to be either a function or a method");
      done();
    });
  });

  describe("when it's called with a boolean(non-callable) target", () => {

    const target = true;

    it("should throw a type error", done => {

      expect(() => circuitBreaker.trap(target)).to.throw(TypeError,
        "The parameter has to be either a function or a method");
      done();
    });
  });

  describe("when it's called with a number(non-callable) target", () => {

    const target = 1;

    it("should throw a type error", done => {

      expect(() => circuitBreaker.trap(target)).to.throw(TypeError,
        "The parameter has to be either a function or a method");
      done();
    });
  });

  describe("when it's called with an object/object(non-callable) target", () => {

    const targetInstance = {};
    const targetMethod = {};

    it("should throw a type error", done => {

      expect(() => circuitBreaker.trap(targetInstance, targetMethod)).to.throw(TypeError,
        "The parameter has to be either a function or a method");
      done();
    });
  });

  describe("when it's called with an string/object(non-callable) target", () => {

    const targetInstance = {"callable": stub().returns({then() {}})};
    const targetMethod = "callable";

    it("should throw a type error", done => {

      expect(() => circuitBreaker.trap(targetMethod, targetInstance)).to.throw(TypeError,
        "The parameter has to be either a function or a method");
      done();
    });
  });
});

describe("The proxy which \"trap\" returns", () => {

  const proxy = circuitBreaker.trap(function callable() {});

  it("should have a method called \"exec\"", done => {

    expect(proxy).to.include("exec");
    expect(proxy.exec).to.be.a.function();
    done();
  });
});

describe("The \"exec\" method of the proxy", () => {

  describe("when when the callable is a function and it's called with some parameters", () => {

    const targetCallable = stub().returns({then() {}});
    const proxy = circuitBreaker.trap(targetCallable);

    it("should call the target callable with the passed params", done => {

      proxy.exec("param1", "param2");

      expect(targetCallable
        .withArgs("param1", "param2")
        .calledOnce).to.be.true();
      done();
    });
  });

  describe("when when the callable is a method and it's called with some parameters", () => {

    const target = {"callable": stub().returns({then() {}})};
    const proxy = circuitBreaker.trap(target, "callable");

    it("should call the target callable with the passed params", done => {

      proxy.exec("param1", "param2");

      expect(target.callable
        .withArgs("param1", "param2")
        .calledOnce).to.be.true();
      done();
    });
  });

  describe("when it's called and the target callable returns with a resolving Q promise", () => {

    function targetCallable() {
      return new Q.Promise(resolve => process.nextTick(() => resolve("aValue")));
    }

    const proxy = circuitBreaker.trap(targetCallable);

    it("should return a native promise which resolves to the same value", () => {

      const promise = proxy.exec();

      return promise
        .then(result => {

          expect(promise).to.be.an.instanceOf(Promise);
          expect(result).to.equal("aValue");
        });
    });
  });

  describe("when it's called and the target callable returns a with a rejecting Q promise", () => {

    function targetCallable() {
      return new Q.Promise((resolve, reject) => process.nextTick(() => reject(new Error("Some i/o error"))));
    }

    const proxy = circuitBreaker.trap(targetCallable);

    it("should returns the same promise which rejects with the same value", () => {

      const promise = proxy.exec();

      expect(promise).to.be.an.instanceOf(Promise);

      return promise.catch(err => expect(err).to.equal(new Error("Some i/o error")));
    });
  });

  describe("when it's called 2-times and the target callable returns a with a rejecting promise", () => {

    function targetCallable() {
      return new Promise((resolve, reject) => process.nextTick(() => reject(new Error("Some i/o error"))));
    }

    const proxy = circuitBreaker.trap(targetCallable);

    it("should open the circuit", () => {

      return proxy.exec()
        .catch(() => proxy.exec())
        .then(result => expect(result).to.equal("The circuit is open"));
    });
  });

  describe("when the threshold number is set to a number " +
    "which the number of errors of the remote call has already exceeded", () => {

    const thresholdNumber = 2;

    function targetCallable() {
      return new Promise((resolve, reject) => process.nextTick(() => reject(new Error("Some i/o error"))));
    }

    const proxy = circuitBreaker.trap(targetCallable);

    it("should open the circuit", () => {

      return proxy
        .setThresholdNum(thresholdNumber)
        .exec() // 1. error
        .catch(() => proxy.exec()) // 2. error
        .catch(() => proxy.exec()) // 3. error
        .then(result => expect(result).to.equal("The circuit is open"));
    });
  });

  describe("when the threshold number is set to a number " +
    "which the number of errors of the remote call has not exceeded yet", () => {

    const thresholdNumber = 2;

    function targetCallable() {
      return new Promise((resolve, reject) => process.nextTick(() => reject(new Error("Some i/o error"))));
    }

    const proxy = circuitBreaker.trap(targetCallable);

    it("should not open the circuit", () => {

      return proxy
        .setThresholdNum(thresholdNumber)
        .exec() // 1. error
        .catch(() => proxy.exec()) // 2. error
        .catch(err => expect(err).to.equal(new Error("Some i/o error")));
    });
  });

  describe("when the threshold error type is set to one which has already exceeded the threshold limit", () => {

    const remoteError = new TypeError("Some type error");
    const thresholdErrType = TypeError;

    function targetCallable() {
      return new Promise((resolve, reject) => process.nextTick(() => reject(remoteError)));
    }

    const proxy = circuitBreaker.trap(targetCallable);

    it("should open the circuit", () => {

      return proxy
        .setThresholdErrType(thresholdErrType)
        .exec()
        .catch(() => proxy.exec())
        .then(result => expect(result).to.equal("The circuit is open"));
    });
  });

  describe("when the threshold error type is not set to one which has already exceeded the threshold limit", () => {

    const remoteError = new Error("Some i/o error");
    const thresholdErrType = TypeError;

    function targetCallable() {
      return new Promise((resolve, reject) => process.nextTick(() => reject(remoteError)));
    }

    const proxy = circuitBreaker.trap(targetCallable);

    it("should not open the circuit", () => {

      return proxy
        .setThresholdErrType(thresholdErrType)
        .exec()
        .catch(() => proxy.exec())
        .catch(err => expect(err).to.equal(remoteError));
    });
  });

  describe("when the threshold error message is set to one which has already exceeded the threshold limit", () => {

    const remoteError = new Error("Remote error msg");
    const thresholdErrMsg = /"Remote error msg"/;

    function targetCallable() {
      return new Promise((resolve, reject) => process.nextTick(() => reject(remoteError)));
    }

    const proxy = circuitBreaker.trap(targetCallable);


    it("should open the circuit", () => {


      return proxy
        .setThresholdErrMsg(thresholdErrMsg)
        .exec()
        .catch(() => proxy.exec())
        .then(result => expect(result).to.equal("The circuit is open"));
    });
  });

  describe("when the threshold error message is set to one which has already exceeded the threshold limit", () => {

    const remoteError = new Error("Remote error msg");
    const thresholdErrMsg = /"Not the remote error msg"/;

    function targetCallable() {
      return new Promise((resolve, reject) => process.nextTick(() => reject(remoteError)));
    }

    const proxy = circuitBreaker.trap(targetCallable);

    it("should not open the circuit", () => {

      return proxy
        .setThresholdErrMsg(thresholdErrMsg)
        .exec()
        .catch(() => proxy.exec())
        .catch(err => expect(err).to.equal(remoteError));
    });
  });

  describe("when the health check is set as a function and the circuit opens", () => {

    function targetCallable() {
      return new Promise((resolve, reject) => process.nextTick(() => reject(new Error("Some i/o error"))));
    }

    const deferred = Q.defer();
    const healthCheck = spy(function healthCheck() {

      deferred.resolve("i/o is healthy");
      return deferred.promise;
    });
    const proxy = circuitBreaker.trap(targetCallable);

    it("should start to running the health check on an interval", () => {

      proxy
        .setHealthCheck(healthCheck, 0)
        .exec()
        .catch(() => proxy.exec());

      return deferred.promise
        .then(() => expect(healthCheck.calledOnce).to.be.true());
    });
  });

  describe("when the health check is set as method and the circuit opens", () => {

    function targetCallable() {
      return new Promise((resolve, reject) => process.nextTick(() => reject(new Error("Some i/o error"))));
    }

    const deferred = Q.defer();
    const healthChecker = {
      "healthCheck": spy(function healthCheck() {

        deferred.resolve("i/o is healthy");
        return deferred.promise;
      })
    };
    const proxy = circuitBreaker.trap(targetCallable);

    it("should start to running the health check on an interval", () => {

      proxy
        .setHealthCheck(healthChecker.healthCheck, 0)
        .exec()
        .catch(() => proxy.exec());

      return deferred.promise
        .then(() => expect(healthChecker.healthCheck.calledOnce).to.be.true());
    });
  });

  describe("when the health check is set as method " +
    "(using instance \"methodName\" notation) and the circuit opens", () => {

    function targetCallable() {
      return new Promise((resolve, reject) => process.nextTick(() => reject(new Error("Some i/o error"))));
    }

    const deferred = Q.defer();
    const healthChecker = {
      "healthCheck": spy(function healthCheck() {

        deferred.resolve("i/o is healthy");
        return deferred.promise;
      })
    };
    const proxy = circuitBreaker.trap(targetCallable);

    it("should start to running the health check on an interval", () => {

      proxy
        .setHealthCheck(healthChecker, "healthCheck", 0)
        .exec()
        .catch(() => proxy.exec());

      return deferred.promise
        .then(() => expect(healthChecker.healthCheck.calledOnce).to.be.true());
    });
  });

  describe("when the health check returns with success (the i/o is healthy)", () => {

    let targetCallable = spy(function callable(resolve) {

      return !resolve ?
        new Promise((resolve, reject) => process.nextTick(() => reject(new Error("Some i/o error")))) :
        new Promise(resolve => process.nextTick(() => resolve("result")));
    });

    const deferred = Q.defer();
    const healthChecker = {
      "healthCheck": spy(function healthCheck() {

        deferred.resolve("i/o is healthy");
        return deferred.promise;
      })
    };
    const proxy = circuitBreaker.trap(targetCallable);

    it("should close the circuit and call the trapped callable again", () => {

      proxy
        .setHealthCheck(healthChecker, "healthCheck", 0)
        .exec(false) // First call. Rejects with an error
        .catch(() => proxy.exec(false)); // Second call. Rejects with an error

      return deferred.promise
        .then(() => {
          process.nextTick(() => {
            targetCallable.reset(); // Preparing for test
            return proxy.exec(true); // Third call after the health check closes the circuit. Resolves...
          });
        })
        .then(() => expect(targetCallable.calledOnce).to.be.true());
    });
  });
});

describe("The \"setThresholdErrType\" method", () => {

  function targetCallable() {
    return new Promise(resolve => process.nextTick(() => resolve("result")));
  }

  const proxy = circuitBreaker.trap(targetCallable);

  describe("when the parameter is not an error type", () => {

    it("should throw a type error", done => {

      class NotAnErrorType {}

      expect(() => proxy.setThresholdErrType(NotAnErrorType))
        .to.throw(TypeError, "The parameter has to be an error type");
      done();
    });
  });

  describe("when the parameter is an error type", () => {

    it("should not throw a type error", done => {

      const thresholdErrType = Error;

      expect(() => proxy.setThresholdErrType(thresholdErrType)).to.not.throw();
      done();
    });
  });

  describe("when the parameter is a type error type", () => {

    it("should not throw a type error", done => {

      const thresholdErrType = TypeError;

      expect(() => proxy.setThresholdErrType(thresholdErrType)).to.not.throw();
      done();
    });
  });

  describe("when the parameter is a range error type", () => {

    it("should not throw a type error", done => {

      const thresholdErrType = RangeError;

      expect(() => proxy.setThresholdErrType(thresholdErrType)).to.not.throw();
      done();
    });
  });

  describe("when the parameter is an extended error type", () => {

    it("should not throw a type error", done => {

      class ExtendedError extends Error {}

      expect(() => proxy.setThresholdErrType(ExtendedError)).to.not.throw();
      done();
    });
  });

  describe("when the parameter is an extended type error type", () => {

    it("should not throw a type error", done => {

      class ExtendedTypeError extends TypeError {}

      expect(() => proxy.setThresholdErrType(ExtendedTypeError)).to.not.throw();
      done();
    });
  });

  describe("when the parameter is an extended Range error type", () => {

    it("should not throw a type error", done => {

      class ExtendedRangeError extends RangeError {}

      expect(() => proxy.setThresholdErrType(ExtendedRangeError)).to.not.throw();
      done();
    });
  });
});

describe("The \"setThresholdErrMsg\" method", () => {

  function targetCallable() {
    return new Promise(resolve => process.nextTick(() => resolve("result")));
  }

  const proxy = circuitBreaker.trap(targetCallable);

  describe("when the parameter is not a regular expression", () => {

    it("should throw a type error", done => {

      const thresholdErrMsg = "Not a regular expression";

      expect(() => proxy.setThresholdErrMsg(thresholdErrMsg))
        .to.throw(TypeError, "The parameter has to be a regular expression");
      done();
    });
  });

  describe("when the parameter is a regular expression", () => {

    it("should not throw a type error", done => {

      const thresholdErrMsg = /"Its a regular expression"/;

      expect(() => proxy.setThresholdErrMsg(thresholdErrMsg)).to.not.throw();
      done();
    });
  });
});

describe("The \"setHealthCheck\" method", () => {

  function targetCallable() {
    return new Promise(resolve => process.nextTick(() => resolve("result")));
  }

  const proxy = circuitBreaker.trap(targetCallable);

  describe("when the health check is set as an object", () => {

    const deferred = Q.defer();
    const healthChecker = {
      "healthCheck": spy(function healthCheck() {

        deferred.resolve("i/o is healthy");
        return deferred.promise;
      })
    };

    it("should throw a type error", done => {

      expect(() => proxy.setHealthCheck(healthChecker, 0))
        .to.throw(TypeError, "The parameter has to be either a function or a method");
      done();
    });
  });

  describe("when the health check is set as a string", () => {

    const healthChecker = "healthChecker";

    it("should throw a type error", done => {

      expect(() => proxy.setHealthCheck(healthChecker, 0))
        .to.throw(TypeError, "The parameter has to be either a function or a method");
      done();
    });
  });

  describe("when the health check is set as a boolean", () => {

    const healthChecker = true;

    it("should throw a type error", done => {

      expect(() => proxy.setHealthCheck(healthChecker, 0))
        .to.throw(TypeError, "The parameter has to be either a function or a method");
      done();
    });
  });

  describe("when the health check is set as a object/objct", () => {

    const healthChecker = {};
    const healthCheck = {};

    it("should throw a type error", done => {

      expect(() => proxy.setHealthCheck(healthChecker, healthCheck, 0))
        .to.throw(TypeError, "The parameter has to be either a function or a method");
      done();
    });
  });

  describe("when the health check is set as a string/object", () => {

    const healthChecker = {healthCheck() {return {then() {}}}};

    it("should throw a type error", done => {

      expect(() => proxy.setHealthCheck("healthCheck", healthChecker, 0))
        .to.throw(TypeError, "The parameter has to be either a function or a method");
      done();
    });
  });

  describe("when the health check inter val is not set", () => {

    const healthChecker = {healthCheck() {return {then() {}}}};

    it("should throw a type error", done => {

      expect(() => proxy.setHealthCheck(healthChecker, "healthCheck")
        .to.throw(TypeError, "Health check interval should be set as number"));
      done();
    });
  });

  describe("when the health check inter val is set as string", () => {

    const healthChecker = {healthCheck() {return {then() {}}}};

    it("should throw a type error", done => {

      expect(() => proxy.setHealthCheck(healthChecker, "healthCheck", "0")
        .to.throw(TypeError, "Health check interval should be set as number"));
      done();
    });
  });

  describe("when the health check inter val is set as boolean", () => {

    const healthChecker = {healthCheck() {return {then() {}}}};

    it("should throw a type error", done => {

      expect(() => proxy.setHealthCheck(healthChecker, "healthCheck", true)
        .to.throw(TypeError, "Health check interval should be set as number"));
      done();
    });
  });

  describe("when the health check inter val is set as boolean", () => {

    const healthChecker = {healthCheck() {return {then() {}}}};

    it("should throw a type error", done => {

      expect(() => proxy.setHealthCheck(healthChecker, "healthCheck", {})
        .to.throw(TypeError, "Health check interval should be set as number"));
      done();
    });
  });

  describe("when the health check inter val is set to 0", () => {

    const healthChecker = {healthCheck() {return {then() {}}}};

    it("should throw a type error", done => {

      expect(() => proxy.setHealthCheck(healthChecker, "healthCheck", 0).to.not.throw());
      done();
    });
  });
});
