/** Explicit Publishing boundary; importing it never creates or binds a server. */
const { startServer } = require('../internal/http.cjs');
module.exports = { startServer };
