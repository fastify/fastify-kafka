'use strict'

const fastify = require('fastify')({
  logger: {
    level: 'debug'
  }
})

fastify
  .register(require('./'), {
    producer: {
      'metadata.broker.list': '127.0.0.1:9092',
      'group.id': 'kafka1',
      'fetch.wait.max.ms': 10,
      'fetch.error.backoff.ms': 50
    },
    consumer: {
      'metadata.broker.list': '127.0.0.1:9092',
      'group.id': 'kafka1',
      'fetch.wait.max.ms': 10,
      'fetch.error.backoff.ms': 50
    }
  })
  .after(err => {
    if (err) throw err

    fastify.kafka.producer.on('error', err => { if (err) throw err })
    fastify.kafka.consumer.on('error', err => { if (err) throw err })

    fastify.kafka.on('test', (msg, commit) => {
      console.log(msg.value.toString())
      commit()
      fastify.close()
    })

    fastify.kafka.consumer.consume()

    fastify.kafka.push({
      topic: 'test',
      payload: 'hello world!',
      key: 'testKey'
    })
  })
