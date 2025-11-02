const jwt = require("jsonwebtoken");

function getAuthCookie(options = {}) {
  const id = options.userId || "68bc6369c17579622cbdd9fe";
  const role = options.role || "user";
  const token = jwt.sign({ id, role }, process.env.JWT_SECRET || "test-secret");
  // return value acceptable to supertest .set('Cookie', ...)
  return [`token=${token}`];
}

module.exports = { getAuthCookie };
