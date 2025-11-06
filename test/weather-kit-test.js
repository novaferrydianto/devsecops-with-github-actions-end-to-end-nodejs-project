import { expect, should, assert } from "chai";
import { doINeed } from "../prepared-for-the-weather.js";
import { weatherData } from "../test-data/sample-data.js";

const monday = weatherData.cold_rainy;
const tuesday = weatherData.mild_windy;
const wednesday = weatherData.hot_sunny;
const thursday = weatherData.cold_clear;
const friday = weatherData.warm_wet;

describe("Test the weather kit module's basic functionality", function () {
  it("should return true for umbrella test if it is raining", function () {
    expect(doINeed.umbrella(monday)).to.be.a("boolean");
    expect(doINeed.umbrella(tuesday)).equal(false);
    expect(doINeed.umbrella(wednesday)).equal(false);
    expect(doINeed.umbrella(friday)).equal(true);
  });

  it("should return true if suncream is required", function () {
    should();
    doINeed.suncream(monday).should.be.a("boolean");
    doINeed.suncream(wednesday).should.equal(true);
  });

  it("should return true if jumper is required", function () {
    assert.typeOf(doINeed.jumper(monday), "boolean");
    assert.equal(doINeed.jumper(wednesday), false);
    assert.equal(doINeed.jumper(thursday), true);
  });

  it("should always return true as water is always required", function () {
    expect(doINeed.water(monday)).equal(true);
  });
});
