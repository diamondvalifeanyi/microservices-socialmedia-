const logger = require("../utils/logger.js");

const authenticateRequest = (req, res, next) => {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    logger.warn(" access attempted without user Id ");
    return res.status(401).json({
      success: false,
      message: "Authentication required! Please login to continue",
    });
  }

  req.user = { userId };
  next();
};

module.exports = authenticateRequest;
// This middleware function checks if the request has a user ID in the headers.
