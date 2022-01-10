'use strict'

const t = require('tap')
const test = t.test
const crypto = require('crypto')
const Fastify = require('fastify')
const fastifyKafka = require('..')
const defaultExport = require('..').default
const { fastifyKafka: namedExport } = require('..')

const defaultOptions = {
  producer: {
    'metadata.broker.list': '127.0.0.1:9092',
    'allow.auto.create.topics': true,
    dr_cb: true
  },
  consumer: {
    'metadata.broker.list': '127.0.0.1:9092',
    'fetch.wait.max.ms': 10,
    'fetch.error.backoff.ms': 50,
    'topic.metadata.refresh.interval.ms': 100,
    'allow.auto.create.topics': true
  },
  consumerTopicConf: {
    'auto.offset.reset': 'beginning'
  },
  metadataOptions: {
    timeout: 2000
  }
}

test('export', function (t) {
  t.plan(3)

  t.test('module export', function (t) {
    t.plan(1)
    t.equal(typeof fastifyKafka, 'function')
  })

  t.test('default export', function (t) {
    t.plan(1)
    t.equal(typeof defaultExport, 'function')
  })

  t.test('named export', function (t) {
    t.plan(1)
    t.equal(typeof namedExport, 'function')
  })
})

test('communication', t => {
  t.plan(7)
  const options = copyPlainObject(defaultOptions)
  const group = generateGroupId()
  options.consumer['group.id'] = group

  const topicName = generateTopicName()

  const producerFastify = Fastify()
  const consumerFastify = Fastify()

  t.teardown(() => producerFastify.close())
  t.teardown(() => consumerFastify.close())

  consumerFastify
    .register(fastifyKafka, { ...options, producer: undefined })
    .after(err => {
      t.error(err)

      consumerFastify.kafka.consumer.on('error', t.fail)
      consumerFastify.kafka.subscribe(topicName)

      consumerFastify.kafka.on(topicName, (msg, commit) => {
        t.equal(msg.value.toString(), 'hello world!')
        commit()

        t.ok(true)
      })

      consumerFastify.kafka.consume()
    })

  producerFastify
    .register(fastifyKafka, { ...options, consumer: undefined })
    .after(err => {
      t.error(err)

      producerFastify.kafka.producer.on('error', t.fail)
      producerFastify.kafka.push({
        topic: topicName,
        payload: 'hello world!',
        key: 'testKey'
      })

      t.ok(true)
    })

  producerFastify.ready(err => {
    t.error(err)

    consumerFastify.ready(err => {
      t.error(err)
    })
  })
})

test('multiple topics', t => {
  t.plan(9)
  const options = copyPlainObject(defaultOptions)
  const group = generateGroupId()
  options.consumer['group.id'] = group

  const topicName1 = generateTopicName()
  const topicName2 = generateTopicName()

  const producerFastify = Fastify()
  const consumerFastify = Fastify()

  t.teardown(() => producerFastify.close())
  t.teardown(() => consumerFastify.close())

  consumerFastify
    .register(fastifyKafka, { ...options, producer: undefined })
    .after(err => {
      t.error(err)

      consumerFastify.kafka.consumer.on('error', t.fail)
      consumerFastify.kafka.subscribe([topicName1, topicName2])

      consumerFastify.kafka.on(topicName1, (msg, commit) => {
        t.equal(msg.value.toString(), 'topic1')
        commit()
        t.ok(true)
      })

      consumerFastify.kafka.on(topicName2, (msg, commit) => {
        t.equal(msg.value.toString(), 'topic2')
        commit()
        t.ok(true)
      })

      consumerFastify.kafka.consume()
    })

  producerFastify
    .register(fastifyKafka, { ...options, consumer: undefined })
    .after(err => {
      t.error(err)

      producerFastify.kafka.producer.on('error', t.fail)
      producerFastify.kafka.push({
        topic: topicName1,
        payload: 'topic1',
        key: 'testKey'
      })
      producerFastify.kafka.push({
        topic: topicName2,
        payload: 'topic2',
        key: 'kafkaKey'
      })

      t.ok(true)
    })

  producerFastify.ready(err => {
    t.error(err)

    consumerFastify.ready(err => {
      t.error(err)
    })
  })
})

test('consume callback', t => {
  const options = copyPlainObject(defaultOptions)
  const group = generateGroupId()
  options.consumer['group.id'] = group
  options.consumer.event_cb = true

  const topicName = generateTopicName()

  const producerFastify = Fastify()
  const consumerFastify = Fastify()

  t.teardown(() => producerFastify.close())
  t.teardown(() => consumerFastify.close())

  consumerFastify
    .register(fastifyKafka, { ...options, producer: undefined })
    .after(err => {
      t.error(err)

      consumerFastify.kafka.consumer.on('error', t.fail)
      consumerFastify.kafka.subscribe(topicName)

      consumerFastify.kafka.on(topicName, t.fail)

      function onConsume (err, message) {
        t.error(err)
        t.match(message, {
          topic: topicName,
          value: Buffer.from('hello world!'),
          key: Buffer.from('testKey')
        })

        t.end()
      }

      consumerFastify.kafka.consume(onConsume)
    })

  producerFastify
    .register(fastifyKafka, { ...options, consumer: undefined })
    .after(err => {
      t.error(err)

      producerFastify.kafka.producer.on('error', t.fail)
      producerFastify.kafka.push({
        topic: topicName,
        payload: 'hello world!',
        key: 'testKey'
      })

      t.ok(true)
    })

  producerFastify.ready(err => {
    t.error(err)

    consumerFastify.ready(err => {
      t.error(err)
    })
  })
})

function generateGroupId () {
  return crypto.randomBytes(20).toString('hex')
}
// Only for test purpose
function copyPlainObject (obj) {
  return JSON.parse(JSON.stringify(obj))
}

function generateTopicName () {
  return crypto.randomBytes(5).toString('hex')
}
