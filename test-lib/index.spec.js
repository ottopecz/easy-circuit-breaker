// const {expect} = require("code");
// const Lab = require("lab");
// const {spy} = require("sinon");
// const circuitBreaker = require("../lib/index");
//
// const {describe, it} = exports.lab = Lab.script();
//
// describe("The \"circuitBreaker\" namespace", () => {
//
//   it("should have a method \"trap\"", done => {
//
//     expect(circuitBreaker).to.only.include("trap");
//     expect(circuitBreaker.trap).to.be.a.function();
//     done();
//   });
// });
//
// describe("The \"trap method\"", () => {
//
//   describe("when it's called with a callable target", () => {
//
//     it("should return a proxy object", done => {
//
//       const proxy = circuitBreaker.trap(function callable() {});
//
//       expect(proxy).to.be.an.object();
//       done();
//     });
//   });
//
//   describe("The returned proxy", () => {
//
//     describe("when the exec method is called with some parameters", () => {
//
//       const targetCallable = spy();
//       const proxy = circuitBreaker.trap(targetCallable);
//
//       it("should call the target callable with the passed params", done => {
//
//         proxy.exec("param1", "param2");
//
//         expect(targetCallable.withArgs("param1", "param2").calledOnce).to.be.true();
//         done()
//       });
//     });
//
//     describe("when the target callable returns a promise which resolves with a value", () => {
//
//       function targetCallable() {
//         return new Promise(resolve => process.nextTick(() => resolve("withSomething")));
//       }
//
//       const proxy = circuitBreaker.trap(targetCallable);
//
//       it("should returns the same promise", () => {
//
//         return proxy.exec().then(result => expect(result).to.equal("withSomething"));
//       });
//     });
//
//     describe("when the target callable returns a promise which rejects with an error", () => {
//
//       function targetCallable() {
//         return new Promise((resolve, reject) => process.nextTick(() => reject(new Error("Some i/o error"))));
//       }
//
//       const proxy = circuitBreaker.trap(targetCallable);
//
//       it("should returns the same promise", () => {
//
//         return proxy.exec().catch(err => expect(err).to.equal(new Error("Some i/o error")));
//       });
//
//       describe.skip("and when the exec method is called again", () => {
//
//         it("should fall back to a blank method", () => {
//
//           return proxy.exec().then(result => expect(result).to.equal("The circuit is open"));
//         });
//       });
//     });
//   });
// });
