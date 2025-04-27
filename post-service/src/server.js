require("dotenv").config();
require("./configDb/db");

const express =require("express");
// const mongoose = require("mongoose");
const Redis = require("ioredis");
const helmet = require("helmet");
const cors = require("cors");
const { RateLimiterRedis } = require('rate-limiter-flexible');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const postRoutes = require("./routes/post-routes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const { connectToRabbitMQ } = require("./utils/rabbitmq")

const app = express();
const PORT = process.env.PORT || 4002;

const redisClient = new Redis(process.env.REDIS_URL);

// middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request body, ${JSON.stringify(req.body)}`);
    next();
});

// DDOS protection and rate limiting
const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: "middleware",
    points: 10,
    duration: 1,
});

app.use((req, res, next) => {
    rateLimiter.consume(req.ip)
    .then(() => next())
    .catch(() => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({ success: false, message: "too many requests"});
    });
});

// IP based rate limiting for sensitive endpoints
const sensitiveEndpointsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    limit: 50,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Sensitive endpoint rate limit exceeded for ip ${req.ip}`);
        res.status(429).json({
            success: false,
            message: "too many requests"
        });
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    })
});


// apply sentitive endpoint rate limiting to specific routes
app.use("/api/posts", sensitiveEndpointsLimiter);

app.use("/api/posts",
    (req, res, next) => {
        req.redisClient = redisClient;
        next();
    },
    postRoutes
);

app.use(errorHandler);

async function startServer() {
    try {
        await connectToRabbitMQ();
        app.listen(PORT, () => {
            logger.info(`Post service running on port ${PORT}`);
        });
    } catch (error) {
        logger.error("failed toconnect to server", error);
        process.exit(1);
    }
}

startServer();

// unhandled promise rejection

process.on("unhandledRejection", (reason, promise) => {
    logger.error("unhandled rejection at", promise, "reason:", reason);
});



