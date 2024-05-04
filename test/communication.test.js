'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const fastifyKafka = require('..')
const {
  generateTopicName,
  generateGroupId,
  getDefaultOptions
} = require('./utils')

test('communication', t => {
  t.plan(7)
  const options = getDefaultOptions()
  const group = generateGroupId()
  options.consumer['group.id'] = group

  const topicName = generateTopicName()

  const producerFastify = Fastify({ logger: true })
  const consumerFastify = Fastify({ logger: true })

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
