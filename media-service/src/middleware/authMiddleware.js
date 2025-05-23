const logger = require("../utils/logger");

const authenticateRequest = (req, res, next) => {
    const userId = req.headers["x-user-id"];

    if(!userId) {
        logger.warn("access attempted without user id");
        return res.status(401).json({
            success: false,
            message: "authentication require!, Pls login to continue",
        });
    }

    req.user = { userId };
    next();
};

module.exports = { authenticateRequest };