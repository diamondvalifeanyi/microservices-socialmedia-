require("dotenv").config();
const mongoose = require("mongoose");
const logger = require("../utils/logger");

async function connectDb() {
    try {
        logger.info("attempting to connect to mongodb...");
        logger.info(`mongoDb url : ${process.env.MONGODB_URL}`);
        const connection = await mongoose.connect(process.env.MONGODB_URL);
        logger.info(`mongoose connection established @${connection.connection.host}`);
    } catch (error) {
        logger.error("mongodb connection error: ", error);
        process.exit(1);
    }
};

connectDb(); 
