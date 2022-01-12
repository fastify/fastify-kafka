'use strict'

const crypto = require('crypto')
const fastify = require('fastify')({
  logger: {
    level: 'debug'
  }
})

const groupId = crypto.randomBytes(20).toString('hex')

fastify
  .register(require('..'), {
    producer: {
      'metadata.broker.list': '127.0.0.1:9092',
      dr_cb: true
    },
    consumer: {
      'metadata.broker.list': '127.0.0.1:9092',
      'group.id': groupId,
      'fetch.wait.max.ms': 10,
      'fetch.error.backoff.ms': 50
    },
    consumerTopicConf: {
      'auto.offset.reset': 'earliest'
    }
  })
  .after(err => {
    if (err) throw err

    fastify.kafka.producer.on('error', err => { if (err) throw err })
    fastify.kafka.consumer.on('error', err => { if (err) throw err })

    fastify.kafka.subscribe(['test', 'kafka'])

    fastify.kafka.on('test', (msg, commit) => {
      console.log(msg.value.toString())
      commit()

      fastify.kafka.push({
        topic: 'kafka',
        payload: 'proooova',
        key: 'testKey'
      })
    })

    fastify.kafka.on('kafka', (msg, commit) => {
      console.log(msg.value.toString())
      commit()
      setImmediate(fastify.close)
    })

    fastify.kafka.consume()

    setTimeout(() => {
      fastify.kafka.push({
        topic: 'test',
        payload: 'hello world!',
        key: 'testKey'
      })
    }, 1000)
  })

process.once('SIGINT', function () {
  fastify.close()
})
