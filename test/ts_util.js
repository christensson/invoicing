"use strict";

let assert = require("chai").assert;
let util = require('../public/util.js');

describe("dateAddDays", () => {
  it("shall add 0 days correctly", () => {
    let now = new Date();
    assert.strictEqual(util.dateAddDays(now, 0).valueOf(), now.valueOf());
  })
});

describe("calcPaymentAdjustment", () => {
  it("shall calc payment adjustment correcly", () => {
    assert.strictEqual(util.calcPaymentAdjustment(100), 0);
    assert.strictEqual(util.calcPaymentAdjustment(100.5), 0.5);
    assert.strictEqual(util.calcPaymentAdjustment(100.4), -0.4);
    assert.strictEqual(util.calcPaymentAdjustment(100.1), -0.1);
    assert.strictEqual(util.calcPaymentAdjustment(100.5), 0.5);
    assert.strictEqual(util.calcPaymentAdjustment(100.51), 0.49);
    assert.strictEqual(util.calcPaymentAdjustment(100.50), 0.50);
    assert.strictEqual(util.calcPaymentAdjustment(100.49), -0.49);
  })
  it("shall calc payment adjustment correctly given one decimal", () => {
    let opt = {numDec: 1};
    assert.strictEqual(util.calcPaymentAdjustment(100.450, opt), 0.05);
    assert.strictEqual(util.calcPaymentAdjustment(100.449, opt), -0.049);
  })
  it("shall calc payment adjustment correctly given two decimals", () => {
    let opt = {numDec: 2};
    assert.strictEqual(util.calcPaymentAdjustment(100.444, opt), -0.004);
    assert.strictEqual(util.calcPaymentAdjustment(100.005, opt), 0.005);
  })
})

describe("formatNumber", () => {
  it("shall format numbers without zero-fill", () => {
    let opt = {decimalSep: ',', thousandSep:' ', numDecimalTrunc: 2, zeroFill: false};
    assert.strictEqual(util.formatNumber(1000, opt), "1 000");
    assert.strictEqual(util.formatNumber(1000.001999, opt), "1 000,00");
    assert.strictEqual(util.formatNumber(1000.00999, opt), "1 000,00");
    assert.strictEqual(util.formatNumber(1000.9, opt), "1 000,9");
    assert.strictEqual(util.formatNumber(1000.1, opt), "1 000,1");
    assert.strictEqual(util.formatNumber(1000.19, opt), "1 000,19");
  })
  it("shall format numbers with zero-fill", () => {
    let opt = {decimalSep: ',', thousandSep:' ', numDecimalTrunc: 2, zeroFill: true};
    assert.strictEqual(util.formatNumber(1000, opt), "1 000,00");
    assert.strictEqual(util.formatNumber(1000.001999, opt), "1 000,00");
    assert.strictEqual(util.formatNumber(1000.00999, opt), "1 000,00");
    assert.strictEqual(util.formatNumber(1000.9, opt), "1 000,90");
  })
  it("shall format numbers with zero-fill and truncation to 3 decimals", () => {
    let opt = {decimalSep: ',', thousandSep:' ', numDecimalTrunc: 3, zeroFill: true};
    assert.strictEqual(util.formatNumber(1000.001, opt), "1 000,001");
    assert.strictEqual(util.formatNumber(1000.001999, opt), "1 000,001");
    assert.strictEqual(util.formatNumber(1000.101999, opt), "1 000,101");
  })
})
