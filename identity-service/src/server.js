require('dotenv').config();
require('./dbConfig/db')
const logger = require('./utils/logger');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const Redis = require('ioredis');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const routes = require('./routes/identity-routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4001;

const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    logger.info(`received ${req.method} request to ${req.url}`);
    logger.info(`Request body, ${JSON.stringify(req.body)}`);
    next();
})

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
        res.status(429).json({ success: false, message: "Too many requests" });
    });
});

// IP based rate limiting for sensitive endpoints
const sensitiveEndpointsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15mins
    limit: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        logger.warn(`sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: "too many requests"
        });
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    })
});

// apply sensitive endpoints limiter to our routes
app.use('/api/auth/register', sensitiveEndpointsLimiter);

// routes
app.use("/api/auth", routes);

//errorHandler
app.use(errorHandler);

app.listen(PORT, () => {
    logger.info(`identity service running on port ${PORT}`);
});

// unhandled promise rejection

process.on("unhandledRejection", (reason, promise) => {
    logger.error("unhandled promise rejection at", promise, "reason", reason);
})




