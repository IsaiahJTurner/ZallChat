var assert = require('assert'),
    vows = require('vows');
// this is an example file, more tests will be added once problems arise.
vows.describe('main').addBatch({
  'When adding 1 + 1': {
    topic: (1 + 1),
    'result should be 2': function (result) {
      assert.isNumber(result);
      assert.equal(result, 2);
    }
  }
}).export(module);