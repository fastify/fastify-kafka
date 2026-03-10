'use strict'

const crypto = require('node:crypto')
const fastify = require('fastify')({
  logger: { level: 'info' }
})

const groupId = crypto.randomBytes(20).toString('hex')

fastify
  .register(require('..'), {
    producer: {
      bootstrapBrokers: ['127.0.0.1:9092'],
      clientId: 'fastify-kafka-test-producer',
      autocreateTopics: true
    },
    consumer: {
      bootstrapBrokers: ['127.0.0.1:9092'],
      // eslint-disable-next-line object-shorthand
      groupId: groupId,
      clientId: 'fastify-kafka-test-consumer',
      autocreateTopics: true
    },
  })
  .after(err => {
    if (err) throw err

    fastify.kafka.on('error', err => {
      fastify.log.error(err, 'Kafka Error')
    })

    // Subscribe to topics
    fastify.kafka.subscribe(['test', 'kafka'])

    // Listener for 'test' topic
    fastify.kafka.on('test', (msg, commit) => {
      console.log('Received on TEST:', msg.value.toString())
      commit()

      // Push a response to the 'kafka' topic
      fastify.kafka.push({
        topic: 'kafka',
        payload: 'Response from test topic',
        key: 'testKey'
      })
    })

    // Listener for 'kafka' topic
    fastify.kafka.on('kafka', (msg, commit) => {
      console.log('Received on KAFKA:', msg.value.toString())
      commit()
      console.log('Test finished successfully. Closing server...')
      setTimeout(() => fastify.close(), 500)
    })

    // Start consuming
    fastify.kafka.consume()

    // Wait 3 seconds to allow Kafka to create topics
    // and stabilize the consumer group before sending the first message.
    setTimeout(() => {
      console.log('Sending initial message...')
      fastify.kafka.push({
        topic: 'test',
        payload: 'hello world!',
        key: 'testKey'
      })
    }, 3000)
  })

fastify.listen({ port: 3000 })

// To run this example:
// 1. Ensure you have a Kafka broker running locally on port 9092.
// 2. Create the required topics manually (recommended):
//    docker exec -it <name_container_kafka> kafka-topics --create --topic test --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
//    docker exec -it <name_container_kafka> kafka-topics --create --topic kafka --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
