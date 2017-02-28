import "babel-polyfill";
import {expect} from "code";
import Lab from "lab";
import app from "../dist/app";

const {describe, it} = exports.lab = Lab.script();

describe("The app unit tests =>", () => {

  describe("The exported object", () => {

    it("should have a property \"foo\" with value \"bar\"", done => {

      expect(app).to.only.include({"foo": "bar"});
      done();
    });
  });
});
