const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis(process.env.REDIS_URL);

const topupQueue = new Queue("topup-queue", {
  connection,
});

module.exports = topupQueue;