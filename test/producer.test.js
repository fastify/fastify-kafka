'use strict'

const { test } = require('node:test')
const log = require('abstract-logging')

const Producer = require('../lib/producer')

require('./utils')

const options = {
  'metadata.broker.list': '192.0.2.1:9092',
  'socket.timeout.ms': 10,
  dr_cb: true
}

test('unreachable brokers', t => {
  t.plan(1)
  const { promise, resolve } = Promise.withResolvers()
  const producer = new Producer(options, log, (err) => {
    t.assert.ok(err)
    resolve()
  }, {}, { timeout: 200 })
  producer.on('ready', (e) => {
    t.assert.ok(!e)
  })

  return promise
})

test('error event before connection', t => {
  t.plan(1)
  const { promise, resolve } = Promise.withResolvers()
  const producer = new Producer(options, log, (err) => {
    t.assert.ok(err)
    resolve()
  }, {}, { timeout: 200 })
  producer.producer.emit('event.error', new Error('Test Error'))
  return promise
})

test('error event after connection', t => {
  t.plan(3)
  const opts = { ...options, 'metadata.broker.list': '127.0.0.1:9092' }
  const { promise, resolve } = Promise.withResolvers()
  const producer = new Producer(opts, log, (err) => {
    t.assert.ok(!err)
    producer.producer.emit('event.error', new Error('Test Error'))
  })
  producer.on('error', (e) => {
    t.assert.ok(e)
    if (e.message === 'Test Error') {
      resolve()
    }
  })
  producer.push({
    topic: 'test',
    payload: 'hello world!',
    key: 'testKey'
  })
  t.after(() => {
    producer.stop()
  })
  return promise
})
