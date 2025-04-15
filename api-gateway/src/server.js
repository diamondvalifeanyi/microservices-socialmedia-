require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const logger = require("./utils/logger");
const proxy = require("express-http-proxy");
const errorHandler = require("./middleware/errorhandler");
const { validateToken } = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

const ratelimitOptions = rateLimit({
    windowsMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for ${req.ip}`);
        res.status(429).json({
            success: false,
            message: "too many requests, try again later",
        })
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),
});

app.use(ratelimitOptions);

app.use((req, res, next) => {
    logger.info(`Received request: ${req.method} to ${req.url}`);
    logger.info(`Request body: ${req.body}`);
    next();
});

const proxyOptions = {
    proxyReqPathResolver: (req) => {
        return req.originalUrl.replace(/^\/v1/, "/api");
    },
    proxyErrorHandler: (err, res, next) => {
        logger.error(`Proxy error: ${err.message}`);
        res.status(502).json({
            message: "internal server error",
            error: err.message,
        });
    },
};

// setting upproxy for identity service
app.use("/v1/auth", proxy(process.env.Identity_Service_Url, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers["Content-Type"] = "application/json";
        return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
        logger.info(
            `Response received from Identity service: ${proxyRes.statusCode}`
        );
        return proxyResData;
    },
})
);


app.use(errorHandler);

app.listen(PORT, () => {
    logger.info(`API GAteway is running on port ${PORT}`);
    logger.info(
      `Identity service is running on port ${process.env.Identity_Service_Url} `
    );
    logger.info(`Redis Url ${process.env.REDIS_URL}`);
})