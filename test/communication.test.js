'use strict'

const { test } = require('node:test')
const Fastify = require('fastify')
const fastifyKafka = require('..')
const {
  generateTopicName,
  generateGroupId,
  getDefaultOptions,
  withResolvers
} = require('./utils')

test('communication', async t => {
  t.plan(5)
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

  const { promise, resolve } = withResolvers()

  consumerFastify
    .register(fastifyKafka, { ...options, producer: undefined })
    .after(err => {
      t.assert.ok(!err)

      consumerFastify.kafka.consumer.on('error', t.assert.fail)
      consumerFastify.kafka.subscribe(topicName)

      consumerFastify.kafka.on(topicName, (msg, commit) => {
        t.assert.deepStrictEqual(msg.value.toString(), 'hello world!')
        commit()

        t.assert.ok(true)
        resolve()
      })

      consumerFastify.kafka.consume()
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
