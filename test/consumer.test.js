'use strict'

const { test, describe, before, after } = require('node:test')
const assert = require('node:assert')
const pino = require('pino')
const Producer = require('../lib/producer')
const Consumer = require('../lib/consumer')
const {
  createTopics,
  getDefaultOptions,
  generateGroupId,
  generateTopicName,
  withResolvers
} = require('./utils')

const log = pino({ level: 'silent' })

describe('Kafka Consumer', () => {
  let deleteTopics
  const topic = generateTopicName()
  const opts = getDefaultOptions()

  before(async () => {
    deleteTopics = await createTopics(topic)
  })
  after(async () => {
    if (deleteTopics) {
      await deleteTopics()
    }
  })

  test('should emit messages as topic-named events', async () => {
    const { promise, resolve } = withResolvers()
    const groupId = generateGroupId()
    const consumer = new Consumer({ ...opts.consumer, groupId }, log, () => {})
    const producer = new Producer(opts.producer, log, () => {})

    consumer.on(topic, (msg, commit) => {
      assert.strictEqual(msg.value.toString(), 'hello-world')
      assert.strictEqual(typeof commit, 'function', 'A commit callback must be provided')
      commit()
      resolve()
    })

    consumer.subscribe(topic).consume()

    // Give Kafka time to stabilize the consumer group
    await new Promise(resolve => setTimeout(resolve, 1500))
    await producer.push({ topic, payload: 'hello-world' })

    await promise
    await new Promise(resolve => consumer.stop(resolve))
    await new Promise(resolve => producer.stop(resolve))
  })

  test('should handle stream destruction gracefully', async () => {
    const { promise, resolve } = withResolvers()
    const consumer = new Consumer({ ...opts.consumer, groupId: generateGroupId() }, log, () => {})

    consumer.on('error', (err) => {
      assert.ok(err instanceof Error)
      resolve()
    })

    consumer.subscribe(topic).consume()

    // Simulate a network failure or sudden stream close
    setTimeout(() => {
      if (consumer._stream) {
        consumer._stream.destroy(new Error('Simulated Stream Crash'))
      }
    }, 500)

    await promise
    await new Promise(resolve => consumer.stop(resolve))
  })

  test('should handle initialization errors', (t, done) => {
    // eslint-disable-next-line no-new
    new Consumer(null, log, (err) => {
      assert.ok(err, 'Constructor should return an error with null options')
      done()
    })
  })

  test('should support batch consumption with callback', async () => {
    const groupId = generateGroupId()
    const consumer = new Consumer({ ...opts.consumer, groupId }, log, () => {})
    const producer = new Producer(opts.producer, log, () => {})
    const { promise, resolve } = withResolvers()

    consumer.subscribe(topic).consume(1, (err, messages) => {
      assert.ifError(err)
      assert.strictEqual(messages.length, 1)
      assert.strictEqual(messages[0].value.toString(), 'batch-payload')
      resolve()
    })

    // Wait for join group
    await new Promise(resolve => setTimeout(resolve, 1500))
    await producer.push({ topic, payload: 'batch-payload' })

    await promise
    await new Promise(resolve => consumer.stop(resolve))
    await new Promise(resolve => producer.stop(resolve))
  })

  test('should handle commit errors and handler exceptions', async () => {
    const groupId = generateGroupId()
    const consumer = new Consumer({ ...opts.consumer, groupId }, log, () => {})
    const producer = new Producer(opts.producer, log, () => {})
    const { promise, resolve } = withResolvers()

    consumer._consumer.commit = async () => {
      throw new Error('Commit Failed')
    }

    consumer.on('error', (err) => {
      assert.ok(err)
      resolve()
    })

    consumer.on(topic, (msg, commit) => {
      commit() // This triggers the mocked commit failure
    })

    consumer.subscribe(topic).consume()
    await new Promise(resolve => setTimeout(resolve, 1500))
    await producer.push({ topic, payload: 'trigger-error' })

    await promise
    await new Promise(resolve => consumer.stop(resolve))
    await new Promise(resolve => producer.stop(resolve))
  })

  test('should handle exceptions in the event handler', async () => {
    const groupId = generateGroupId()
    const consumer = new Consumer({ ...opts.consumer, groupId }, log, () => {})
    const producer = new Producer(opts.producer, log, () => {})
    const { promise, resolve } = withResolvers()

    consumer.on('error', (err) => {
      assert.strictEqual(err.message, 'Handler Crash')
      resolve()
    })

    consumer.on(topic, () => {
      throw new Error('Handler Crash')
    })

    consumer.subscribe(topic).consume()
    await new Promise(resolve => setTimeout(resolve, 1500))
    await producer.push({ topic, payload: 'trigger' })

    await promise
    await new Promise(resolve => consumer.stop(resolve))
    await new Promise(resolve => producer.stop(resolve))
  })

  test('should handle errors in batch consume', async () => {
    const groupId = generateGroupId()
    const consumer = new Consumer({ ...opts.consumer, groupId }, log, () => {})
    const { promise, resolve } = withResolvers()

    consumer._consumer.consume = async () => {
      throw new Error('Batch Error')
    }

    consumer.consume(1, (err) => {
      assert.strictEqual(err.message, 'Batch Error')
      resolve()
    })

    await promise
    await new Promise(resolve => consumer.stop(resolve))
  })

  test('should handle error when closing stream fails in batch mode', async () => {
    const consumer = new Consumer({ ...opts.consumer, groupId: generateGroupId() }, log, () => {})
    const { promise, resolve } = withResolvers()

    const mockStream = {
      [Symbol.asyncIterator]: async function * () { yield { value: 'test' } },
      close: async () => { throw new Error('Close stream failed') }
    }

    consumer._consumer.consume = async () => mockStream

    consumer.consume(1, (err) => {
      assert.ok(err)
      resolve()
    })

    await promise
    await new Promise(resolve => consumer.stop(resolve))
  })

  test('should handle errors during cleanup in stop', async () => {
    const consumer = new Consumer({ ...opts.consumer, groupId: generateGroupId() }, log, () => {})
    const { promise, resolve } = withResolvers()

    consumer._consumer.close = async () => {
      throw new Error('Final cleanup failed')
    }

    consumer.stop((err) => {
      assert.strictEqual(err.message, 'Final cleanup failed')
      resolve()
    })

    await promise
  })

  test('should break loop if stopped while streaming', async () => {
    const consumer = new Consumer({ ...opts.consumer, groupId: generateGroupId() }, log, () => {})

    // Mocking a stream that yields messages indefinitely
    const mockStream = {
      [Symbol.asyncIterator]: async function * () {
        yield { topic, value: '1' }
        yield { topic, value: '2' }
      },
      close: async () => {}
    }
    consumer._consumer.consume = async () => mockStream

    consumer.subscribe(topic).consume()
    consumer._running = false

    await new Promise(resolve => consumer.stop(resolve))
  })

  test('should return if already running', (t, done) => {
    const groupId = generateGroupId()
    const consumerOpts = { ...opts.consumer, groupId }

    const c = new Consumer(consumerOpts, log, () => {})

    c._startStreaming = async () => {}

    c.subscribe(topic).consume()
    assert.strictEqual(c._running, true)

    const instance = c.consume()
    assert.strictEqual(instance, c)
    c.stop(done)
  })

  test('should handle subscribe with array of topics', (t, done) => {
    const consumer = new Consumer({ ...opts.consumer, groupId: generateGroupId() }, log, () => {})

    const result = consumer.subscribe([topic, 'other-topic'])

    assert.deepStrictEqual(consumer._subscriptions, [topic, 'other-topic'])
    assert.strictEqual(result, consumer)
    consumer.stop(done)
  })

  test('should handle close error inside catch block of _consumeBatch', async () => {
    const consumer = new Consumer({ ...opts.consumer, groupId: generateGroupId() }, log, () => {})
    const { promise, resolve } = withResolvers()

    const mockStream = {
      [Symbol.asyncIterator]: async function * () {
        throw new Error('iteration failed')
      },
      close: async () => { throw new Error('close also failed') }
    }

    consumer._consumer.consume = async () => mockStream

    consumer.subscribe(topic).consume(1, (err) => {
      assert.strictEqual(err.message, 'iteration failed')
      resolve()
    })

    await promise
    await new Promise(resolve => consumer.stop(resolve))
  })

  test('should call cbk with error on batch timeout', async () => {
    const consumer = new Consumer({ ...opts.consumer, groupId: generateGroupId() }, log, () => {})
    const { promise, resolve } = withResolvers()

    let cancelWait
    const mockStream = {
      [Symbol.asyncIterator]: async function * () {
        yield { topic, value: 'partial' }
        await new Promise(resolve => { cancelWait = resolve })
      },
      close: async () => {
        if (cancelWait) cancelWait()
      }
    }

    consumer._consumer.consume = async () => mockStream
    consumer._batchTimeout = 300

    consumer.subscribe(topic).consume(10, (err) => {
      assert.strictEqual(err.message, 'kafka-consumer:batch-timeout')
      resolve()
    })

    await promise
    await new Promise(resolve => consumer.stop(resolve))
  })
})
