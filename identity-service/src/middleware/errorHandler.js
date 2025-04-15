const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error(err.stack);
    
    res.status(err.status || 500).json({
        message: err.message || "internal server error",
    })
};

module.exports = errorHandler;
// This middleware function is used to handle errors in the application. It takes four parameters: err, req, res, and next. The function logs the error stack using a logger utility and sends a JSON response with the error message and status code. If no status code is provided, it defaults to 500 (internal server error). This middleware should be used in the Express application to catch and handle errors that occur during request processing.