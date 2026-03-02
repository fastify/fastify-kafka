'use strict'

const { test, describe, before, after } = require('node:test')
const assert = require('node:assert')
const pino = require('pino')
const Producer = require('../lib/producer')
const { createTopics, getDefaultOptions, generateTopicName } = require('./utils')

const log = pino({ level: 'silent' })

describe('Kafka Producer', () => {
  let deleteTopics
  const topic = generateTopicName()
  const opts = getDefaultOptions()

  before(async () => {
    deleteTopics = await createTopics(topic)
  })

  after(async () => {
    if (deleteTopics) await deleteTopics()
  })

  test('should initialize and send a message correctly', async () => {
    const producer = new Producer(opts.producer, log, () => {})

    const instance = await producer.push({
      topic,
      payload: 'hello world',
      key: 'test-key'
    })

    assert.strictEqual(instance, producer, 'push() should return this for chaining')
    await new Promise(resolve => producer.stop(resolve))
  })

  test('should handle send errors when broker is invalid', async () => {
    const invalidOpts = { bootstrapBrokers: ['127.0.0.1:9001'] }
    const producer = new Producer(invalidOpts, log, () => {})

    await assert.rejects(
      producer.push({ topic: 'test', payload: 'data' }),
      { code: 'PLT_KFK_MULTIPLE' }
    )
    await new Promise(resolve => producer.stop(resolve))
  })

  test('should handle constructor errors', (t, done) => {
    // eslint-disable-next-line no-new
    new Producer(null, log, (err) => {
      assert.ok(err, 'Should return an error when opts are null')
      done()
    })
  })

  test('should handle stop without a callback', () => {
    const producer = new Producer(opts.producer, log, () => {})
    producer.stop()
    assert.ok(true)
  })

  test('should handle errors when stopping the producer', (t, done) => {
    const producer = new Producer(opts.producer, log, () => {})
    producer._producer.close = async () => {
      throw new Error('Forced Shutdown Error')
    }

    producer.stop((err) => {
      assert.strictEqual(err.message, 'Forced Shutdown Error')
      done()
    })
  })

  test('should handle stop when producer is not initialized', (t, done) => {
    // Mocking an uninitialized producer
    const producer = new Producer({}, log, () => {}, {})
    producer._producer = null

    producer.stop(() => {
      done()
    })
  })

  test('should handle null partition', async () => {
    const producer = new Producer(opts.producer, log, () => {})

    await producer.push({
      topic,
      payload: 'no-partition',
      partition: null
    })

    await new Promise(resolve => producer.stop(resolve))
  })
})
