'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const fastifyKafka = require('..')
const { getDefaultOptions, generateGroupId, generateTopicName } = require('./utils')

test('multiple topics', t => {
  t.plan(9)
  const options = getDefaultOptions()
  const group = generateGroupId()
  options.consumer['group.id'] = group

  const topicName1 = generateTopicName()
  const topicName2 = generateTopicName()

  const producerFastify = Fastify()
  const consumerFastify = Fastify()

  consumerFastify
    .register(fastifyKafka, { ...options, producer: undefined })
    .after(err => {
      t.error(err)

      consumerFastify.kafka.consumer.on('error', () => {
        t.fail()
      })
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

      producerFastify.kafka.producer.on('error', () => {
        t.fail()
      })
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

  t.after(() => {
    producerFastify.kafka.producer.stop()
    consumerFastify.kafka.consumer.stop()
    producerFastify.close()
    consumerFastify.close()
  })
})
