'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const fastifyKafka = require('./')

test('Should add a kafka producer and consumer to the fastify instance', t => {
  t.plan(2)

  const fastify = Fastify()

  fastify
    .register(fastifyKafka, {
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
      t.error(err)

      fastify.kafka.producer.on('error', t.fail)
      fastify.kafka.consumer.on('error', t.fail)

      fastify.kafka.on('test', (msg, commit) => {
        t.strictEqual(msg.value.toString(), 'hello world!')
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
})
