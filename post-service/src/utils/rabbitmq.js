const amqp = require("amqplib");
const logger = require("./logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook_events";

async function connectToRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("connected to rabbit mq");
    return channel;
  } catch (error) {
    logger.error("Error connecting to rabbitMQ");
    throw error;
  }
}

async function publishEvent(routingKey, message) {
  try {
    if (!channel) {
      await connectToRabbitMQ();
    }
    channel.publish(
      EXCHANGE_NAME,
      routingKey,
      Buffer.from(JSON.stringify(message))
    ); // Corrected typo and wrapped in try-catch
    logger.info(`Event published: ${routingKey}`);
  } catch (error) {
    logger.error("Error publishing event:", error);
    // Optionally handle the error further, e.g., retry or queue the message
  }
}

module.exports = { connectToRabbitMQ, publishEvent };
