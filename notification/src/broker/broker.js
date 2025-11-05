const amqplib = require("amqplib");

let channel, connection;

async function Connect() {
  if (connection) return connection;

  try {
    connection = await amqplib.connect(process.env.RABBIT_URL);

    console.log("Connected to RabbitMQ");

    channel = await connection.createChannel();
  } catch (error) {
    // Error connecting to RabbitMQ suppressed
  }
}

async function publishtoQueue(queueName, data = {}) {
  if (!channel || !connection) await Connect();

  await channel.assertQueue(queueName, {
    durable: true,
  });

  channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));
  console.log("Message send to queue", queueName, data);
}

async function consumeFromQueue(queueName, callback) {
  if (!channel || !connection) await Connect();

  await channel.assertQueue(queueName, {
    durable: true,
  });

  channel.consume(queueName, async (msg) => {
    const data = JSON.parse(msg.content.toString());
    await callback(data);
    channel.ack(msg);
  });
}

module.exports = {
  Connect,
  channel,
  connection,
  publishtoQueue,
  consumeFromQueue,
};
