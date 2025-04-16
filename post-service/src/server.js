require("dotenv").config();
require("./dbConfig/db");

const express =require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const helmet = require("helmet");
const cors = require("cors");
//const postRoutes
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
// const { connectToRabbitMQ }

const app = express();
const port = process.env.PORT || 3002;

const redisClient = new Redis(process.env.REDIS_URL);

// middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request body, ${re.body}`);
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
const sensitiveEndpointsLimiter = rateLimit

