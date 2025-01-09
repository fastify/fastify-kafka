'use strict'

const { test } = require('node:test')
const Fastify = require('fastify')
const fastifyKafka = require('..')
const { getDefaultOptions, generateGroupId, generateTopicName, withResolvers } = require('./utils')

test('multiple topics', async t => {
  t.plan(7)
  const options = getDefaultOptions()
  const group = generateGroupId()
  options.consumer['group.id'] = group

  const topicName1 = generateTopicName()
  const topicName2 = generateTopicName()

  const producerFastify = Fastify()
  const consumerFastify = Fastify()

  consumerFastify
    .register(fastifyKafka, { ...options, producer: undefined })
    .after(async err => {
      t.assert.ok(!err)

      consumerFastify.kafka.consumer.on('error', () => {
        t.assert.fail()
      })
      consumerFastify.kafka.subscribe([topicName1, topicName2])

      const { promise: promiseTopic1, resolve: resolveTopic1 } = withResolvers()
      const { promise: promiseTopic2, resolve: resolveTopic2 } = withResolvers()

      consumerFastify.kafka.on(topicName1, (msg, commit) => {
        t.assert.deepStrictEqual(msg.value.toString(), 'topic1')
        commit()
        t.assert.ok(true)
        resolveTopic1()
      })

      consumerFastify.kafka.on(topicName2, (msg, commit) => {
        t.assert.deepStrictEqual(msg.value.toString(), 'topic2')
        commit()
        t.assert.ok(true)
        resolveTopic2()
      })

      consumerFastify.kafka.consume()

      await Promise.all([promiseTopic1, promiseTopic2])
    })

  producerFastify
    .register(fastifyKafka, { ...options, consumer: undefined })
    .after(err => {
      t.assert.ok(!err)

      producerFastify.kafka.producer.on('error', () => {
        t.assert.fail()
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

      t.assert.ok(true)
    })

  await producerFastify.ready()
  await consumerFastify.ready()

  t.after(() => {
    producerFastify.kafka.producer.stop()
    consumerFastify.kafka.consumer.stop()
    producerFastify.close()
    consumerFastify.close()
  })
})
