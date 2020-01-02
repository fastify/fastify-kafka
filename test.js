'use strict'

const t = require('tap')
const test = t.test
const crypto = require('crypto')
const Fastify = require('fastify')
const fastifyKafka = require('./')

const logger = { level: 'trace' }

const defaultOptions = {
  producer: {
    'metadata.broker.list': '127.0.0.1:9092',
    'fetch.wait.max.ms': 10,
    'fetch.error.backoff.ms': 50,
    'dr_cb': true
  },
  consumer: {
    'metadata.broker.list': '127.0.0.1:9092',
    'fetch.wait.max.ms': 10,
    'fetch.error.backoff.ms': 50
  }
}

test('communication', t => {
  t.plan(5)
  const options = copyPlainObject(defaultOptions)
  const group = generateGroupId()
  options.consumer['group.id'] = group
  options.producer['group.id'] = group

  const producerFastify = Fastify({ logger })
  const consumerFastify = Fastify({ logger })

  t.tearDown(() => producerFastify.close())
  t.tearDown(() => consumerFastify.close())

  consumerFastify
    .register(fastifyKafka, {...options, producer: undefined})
    .after(err => {
      t.error(err)

      consumerFastify.kafka.consumer.on('error', t.fail)
      consumerFastify.kafka.subscribe('test')

      consumerFastify.kafka.on('test', (msg, commit) => {
        t.strictEqual(msg.value.toString(), 'hello world!')
        commit()

        t.ok(true)
      })

      consumerFastify.kafka.consume()
    })

  producerFastify
    .register(fastifyKafka, {...options, consumer: undefined})
    .after(err => {
      t.error(err)

      producerFastify.kafka.producer.on('error', t.fail)
      setTimeout(() => {
        producerFastify.kafka.push({
          topic: 'test',
          payload: 'hello world!',
          key: 'testKey'
        })

        t.ok(true)
      }, 1000)
    })
})

test('multiple topics', t => {
  t.plan(7)
  const options = copyPlainObject(defaultOptions)
  const group = generateGroupId()
  options.consumer['group.id'] = group
  options.producer['group.id'] = group

  const producerFastify = Fastify({ logger })
  const consumerFastify = Fastify({ logger })

  t.tearDown(() => producerFastify.close())
  t.tearDown(() => consumerFastify.close())

  consumerFastify
    .register(fastifyKafka, {...options, producer: undefined})
    .after(err => {
      t.error(err)

      consumerFastify.kafka.consumer.on('error', t.fail)
      consumerFastify.kafka.subscribe(['test', 'kafka'])

      consumerFastify.kafka.on('test', (msg, commit) => {
        console.log('FROM TEST')
        t.strictEqual(msg.value.toString(), 'test')
        commit()
        t.ok(true)
      })

      consumerFastify.kafka.on('kafka', (msg, commit) => {
        console.log('FROM KAFKA')
        t.strictEqual(msg.value.toString(), 'kafka')
        commit()
        t.ok(true)
      })

      consumerFastify.kafka.consume()
    })

  producerFastify
    .register(fastifyKafka, {...options, consumer: undefined})
    .after(err => {
      t.error(err)

      producerFastify.kafka.producer.on('error', t.fail)
      setTimeout(() => {
        producerFastify.kafka.push({
          topic: 'test',
          payload: 'test',
          key: 'testKey'
        })
        producerFastify.kafka.push({
          topic: 'kafka',
          payload: 'kafka',
          key: 'kafkaKey'
        })

        t.ok(true)
      }, 1000)
    })
})


/*
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
      setTimeout(() => {
        fastify.kafka.push({
          topic: 'test',
          payload: 'hello world!',
          key: 'testKey'
        })
      }, 1000)
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

      setTimeout(() => {
        fastify.kafka.push({
          topic: 'test',
          payload: 'hello world!',
          key: 'testKey'
        })
      }, 1000)
    })
})
*/

function generateGroupId() {
  const group = crypto.randomBytes(20).toString('hex')
  return group
}
function copyPlainObject(obj) {
  return JSON.parse(JSON.stringify(obj))
}
