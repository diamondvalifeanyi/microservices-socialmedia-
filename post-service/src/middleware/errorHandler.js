const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
    logger.error(err.stack);

    res.status(err.status || 500).json({
        message: err.message || "Internal Server error",
    });
};

module.exports = errorHandler;
// This middleware function handles errors that occur in the application. It logs the error stack and sends a JSON response with the error message and status code. If no status code is provided, it defaults to 500 (Internal Server Error).