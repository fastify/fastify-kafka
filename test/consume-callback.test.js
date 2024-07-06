'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const fastifyKafka = require('..')
const { getDefaultOptions, generateGroupId, generateTopicName } = require('./utils')

test('consume callback', t => {
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
