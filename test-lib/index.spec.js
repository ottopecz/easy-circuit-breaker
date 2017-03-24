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

  describe("when it's called with a callable target", () => {

    it("should return a proxy object", done => {

      const proxy = circuitBreaker.trap(function callable() {});

      expect(proxy).to.be.an.object();
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

  describe("when it's called with some parameters", () => {

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

  // @todo Write a testcase for type check of callable -> It has to return a promise

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
          expect(result).to.equal("aValue")
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

    describe("The \"exec\" method", () => {

      it("should open the circuit", () => {

        function targetCallable() {
          return new Promise((resolve, reject) => process.nextTick(() => reject(new Error("Some i/o error"))));
        }

        const proxy = circuitBreaker.trap(targetCallable);

        return proxy
          .setThresholdNum(thresholdNumber)
          .exec() // 1. error
          .catch(() => proxy.exec()) // 2. error
          .catch(() => proxy.exec()) // 3. error
          .then(result => expect(result).to.equal("The circuit is open"));
      });
    });
  });

  describe("when the threshold number is set to a number " +
    "which the number of errors of the remote call has not exceeded yet", () => {

    const thresholdNumber = 2;

    describe("The \"exec\" method", () => {

      it("should not open the circuit", () => {

        function targetCallable() {
          return new Promise((resolve, reject) => process.nextTick(() => reject(new Error("Some i/o error"))));
        }

        const proxy = circuitBreaker.trap(targetCallable);

        return proxy
          .setThresholdNum(thresholdNumber)
          .exec() // 1. error
          .catch(() => proxy.exec()) // 2. error
          .catch(err => expect(err).to.equal(new Error("Some i/o error")));
      });
    });
  });
});

// describe("The \"setThresholdErrType\" method", () => {
//
//   describe("when it sets the threshold error type is the same like the remote err has", () => {
//
//     const remoteError = new TypeError("Some type error");
//     const thresholdErrType = TypeError;
//
//     describe("The \"exec\" method", () => {
//
//       it("should open the circuit", () => {
//
//         function targetCallable() {
//           return new Promise((resolve, reject) => process.nextTick(() => reject(remoteError)));
//         }
//
//         const proxy = circuitBreaker.trap(targetCallable);
//
//         return proxy
//           .setThresholdErrType(thresholdErrType)
//           .exec()
//           .catch(() => proxy.exec())
//           .then(result => expect(result).to.equal("The circuit is open"));
//       });
//     });
//   });
//
//   describe("when it sets the threshold error type is the same like the remote err has", () => {
//
//     const remoteError = new Error("Some i/o error");
//     const thresholdErrType = TypeError;
//
//     describe("The \"exec\" method", () => {
//
//       it("should not open the circuit", () => {
//
//         function targetCallable() {
//           return new Promise((resolve, reject) => process.nextTick(() => reject(remoteError)));
//         }
//
//         const proxy = circuitBreaker.trap(targetCallable);
//
//         return proxy
//           .setThresholdErrType(thresholdErrType)
//           .exec()
//           .catch(() => proxy.exec())
//           .catch(err => expect(err).to.equal(remoteError));
//       });
//     });
//   });
// });
//
// describe("The \"setThresholdErrMsg\" method", () => {
//
//   describe("when it sets the threshold error message the same like the remote err has", () => {
//
//     const remoteError = new Error("Remote error msg");
//     const thresholdErrMsg = /"Remote error msg"/;
//
//     describe("The \"exec\" method", () => {
//
//       it("should open the circuit", () => {
//
//         function targetCallable() {
//           return new Promise((resolve, reject) => process.nextTick(() => reject(remoteError)));
//         }
//
//         const proxy = circuitBreaker.trap(targetCallable);
//
//         return proxy
//           .setThresholdErrMsg(thresholdErrMsg)
//           .exec()
//           .catch(() => proxy.exec())
//           .then(result => expect(result).to.equal("The circuit is open"));
//       });
//     });
//   });
//
//   describe("when it sets the threshold error message the same like the remote err has", () => {
//
//     const remoteError = new Error("Remote error msg");
//     const thresholdErrMsg = /"Not the remote error msg"/;
//
//     describe("The \"exec\" method", () => {
//
//       it("should not open the circuit", () => {
//
//         function targetCallable() {
//           return new Promise((resolve, reject) => process.nextTick(() => reject(remoteError)));
//         }
//
//         const proxy = circuitBreaker.trap(targetCallable);
//
//         return proxy
//           .setThresholdErrMsg(thresholdErrMsg)
//           .exec()
//           .catch(() => proxy.exec())
//           .catch(err => expect(err).to.equal(remoteError));
//       });
//     });
//   });
// });
//
// describe("The \"setHealthCheck\" method", () => {
//
//   describe("when it sets the health check call and the circuit opens", () => {
//
//     describe("The \"exec\" method", () => {
//
//       it("should start to running the health check on an interval", () => {
//
//         function targetCallable() {
//           return new Promise((resolve, reject) => process.nextTick(() => reject(new Error("Some i/o error"))));
//         }
//
//         const deferred = Q.defer();
//         const healthChecker = {
//           "healthCheck": spy(function healthCheck() {
//             deferred.resolve("i/o is healthy");
//             return deferred.promise;
//           })
//         };
//         const proxy = circuitBreaker.trap(targetCallable);
//
//         proxy
//           .setHealthCheck(healthChecker, "healthCheck", 0)
//           .exec()
//           .catch(() => proxy.exec());
//
//         return deferred.promise
//           .then(result => {
//             expect(result).to.equal("i/o is healthy");
//           });
//       });
//     });
//   });
// });
