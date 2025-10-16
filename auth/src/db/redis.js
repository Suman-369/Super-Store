const Redis = require("ioredis");

// Construct the Redis connection URL for better compatibility with cloud services
const redisUrl = `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

const redis = new Redis(redisUrl, {
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true, // Connect only when needed
});

redis.on("connect", () => {
    console.log("Redis connected successfully");
});

redis.on("error", (err) => {
    console.error("Redis connection error:", err.message);
    // Optionally, you can add retry logic or fallback here
});

redis.on("ready", () => {
    console.log("Redis is ready to receive commands");
});

redis.on("close", () => {
    console.log("Redis connection closed");
});

module.exports = redis;
