var vows = require('vows'),
    assert = require('assert'),
    http = require('http'),
    tobi = require('tobi');
// Create a Test Suite
// this is an example of how tests could be implememented
var suite = vows.describe('Access Security'),
    browser = tobi.createBrowser(PORT, HOST);

var HOST = 'localhost',
    PORT = 8087;
var client = {
  get: function(path, header, callback) {
    browser.get(path, { headers: header }, callback)
  },
  post: function(path, data, header, callback) {
    browser.post(path, { body: JSON.stringify(data), headers: header }, callback)
  }
}

function respondsWith(status) {
    var context = {
        topic: function () {
            // Get the current context's name, such as "POST /"
            // and split it at the space.
            var req    = this.context.name.split(/ +/), // ["POST", "/"]
                method = req[0].toLowerCase(),          // "post"
                path   = req[1];                        // "/"

            // Perform the contextual client request,
            // with the above method and path.
            client[method](path, this.callback);
        }
    };
    // Create and assign the vow to the context.
    // The description is generated from the expected status code
    // and status name, from node's http module.
    context['should respond with a ' + status + ' '
           + http.STATUS_CODES[status]] = assertStatus(status);

    return context;
}
function assertHeaders(error, errorDescription) {
  return function (res, $) {
    if (error || errorDescription) {
      res.should.have.header('www-authenticate');
      header = oauth.parseAuthenticationHeader(res.headers['www-authenticate']);
      if (error) error.should.equal(header.error);
      if (errorDescription) errorDescription.should.equal(header.error_description);
    } else {
      res.should.not.have.property('www-authenticate');
    }
  }
}
function assertStatus(code) {
  return function (res, $) {
    res.should.have.status(code)
  }
}
suite.addBatch({ 'GET  /':  respondsWith(200),
  'POST /': respondsWith(405),
  'GET  /resources (no key)': respondsWith(403)
}).exportTo(module);