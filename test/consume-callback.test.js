'use strict'

const { test } = require('node:test')
const Fastify = require('fastify')
const fastifyKafka = require('..')
const { getDefaultOptions, generateGroupId, generateTopicName, withResolvers } = require('./utils')

test('consume callback', async t => {
  const options = getDefaultOptions()
  const group = generateGroupId()
  options.consumer['group.id'] = group
  options.consumer.event_cb = true

  const topicName = generateTopicName()

  const producerFastify = Fastify()
  const consumerFastify = Fastify()

  t.after(() => {
    producerFastify.close()
    consumerFastify.close()
  })

  const { promise, resolve } = withResolvers()

  consumerFastify
    .register(fastifyKafka, { ...options, producer: undefined })
    .after(err => {
      t.assert.ok(!err)

      consumerFastify.kafka.consumer.on('error', t.assert.fail)
      consumerFastify.kafka.subscribe(topicName)

      consumerFastify.kafka.on(topicName, t.assert.fail)

      function onConsume (err, message) {
        t.assert.ok(!err)
        t.assert.deepStrictEqual(message.topic, topicName)
        t.assert.deepStrictEqual(message.value.toString(), 'hello world!')
        t.assert.deepStrictEqual(message.key.toString(), 'testKey')

        resolve()
      }

      consumerFastify.kafka.consume(onConsume)
    })

  producerFastify
    .register(fastifyKafka, { ...options, consumer: undefined })
    .after(err => {
      t.assert.ok(!err)

      producerFastify.kafka.producer.on('error', t.assert.fail)
      producerFastify.kafka.push({
        topic: topicName,
        payload: 'hello world!',
        key: 'testKey'
      })

      t.assert.ok(true)
    })

  await producerFastify.ready()
  await consumerFastify.ready()

  return promise
})
