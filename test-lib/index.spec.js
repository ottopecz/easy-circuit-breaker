const {expect} = require("code");
const Lab = require("lab");
const circuitBreaker = require("../lib/index");

const {describe, it} = exports.lab = Lab.script();

describe("The circuitBreaker unit tests =>", () => {

  it("should have a property \"foo\"", done => {

    expect(circuitBreaker).to.only.include({"foo": "bar"});
    done();
  });
});
