'use strict'

const t = require('tap')
const test = t.test
const crypto = require('crypto')
const Fastify = require('fastify')
const fastifyKafka = require('./')

const options = {
  producer: {
    'metadata.broker.list': '127.0.0.1:9092',
    'group.id': 'kafka1',
    'fetch.wait.max.ms': 10,
    'fetch.error.backoff.ms': 50,
    'dr_cb': true
  },
  consumer: {
    'metadata.broker.list': '127.0.0.1:9092',
    'group.id': 'kafka1',
    'fetch.wait.max.ms': 10,
    'fetch.error.backoff.ms': 50
  }
}

test('Should add a kafka producer and consumer to the fastify instance', t => {
  t.plan(2)

  const fastify = Fastify()
  const group = crypto.randomBytes(20).toString('hex')
  options.producer['group.id'] = group
  options.consumer['group.id'] = group

  fastify
    .register(fastifyKafka, options)
    .after(err => {
      t.error(err)

      fastify.kafka.producer.on('error', t.fail)
      fastify.kafka.consumer.on('error', t.fail)

      fastify.kafka.subscribe('test')

      fastify.kafka.on('test', (msg, commit) => {
        t.strictEqual(msg.value.toString(), 'hello world!')
        commit()
        fastify.close()
      })

      fastify.kafka.consume()

      fastify.kafka.push({
        topic: 'test',
        payload: 'hello world!',
        key: 'testKey'
      })
    })
})

test('Register to multiple topics', t => {
  t.plan(3)

  const fastify = Fastify()
  const group = crypto.randomBytes(20).toString('hex')
  options.producer['group.id'] = group
  options.consumer['group.id'] = group

  fastify
    .register(fastifyKafka, options)
    .after(err => {
      t.error(err)

      fastify.kafka.producer.on('error', t.fail)
      fastify.kafka.consumer.on('error', t.fail)

      fastify.kafka.subscribe(['test', 'kafka'])

      fastify.kafka.on('test', (msg, commit) => {
        t.strictEqual(msg.value.toString(), 'hello world!')
        commit()

        fastify.kafka.push({
          topic: 'kafka',
          payload: 'winter is coming',
          key: 'testKey'
        })
      })

      fastify.kafka.on('kafka', (msg, commit) => {
        t.strictEqual(msg.value.toString(), 'winter is coming')
        commit()
        fastify.close()
      })

      fastify.kafka.consume()

      fastify.kafka.push({
        topic: 'test',
        payload: 'hello world!',
        key: 'testkey'
      })
    })
})
