'use strict'

const { test } = require('node:test')
const log = require('abstract-logging')

const Consumer = require('../lib/consumer')

require('./utils')

const options = {
  'metadata.broker.list': '192.0.2.1:9092',
  'fetch.wait.max.ms': 10,
  'fetch.error.backoff.ms': 50,
  'group.id': 'new-group-id'
}

test('unreachable brokers', async t => {
  t.plan(1)
  const { promise, resolve } = Promise.withResolvers()
  const consumer = new Consumer(options, log, (err) => {
    t.assert.ok(err)
    resolve()
  }, {}, { timeout: 200 })
  consumer.on('ready', (e) => {
    t.assert.ok(!e)
  })

  return promise
})

test('error event before connection', t => {
  t.plan(1)
  const { promise, resolve } = Promise.withResolvers()
  const consumer = new Consumer(options, log, (err) => {
    t.assert.ok(err)
    resolve()
  }, {}, { timeout: 200 })
  consumer.consumer.emit('event.error', new Error('Test Error'))
  return promise
})

test('error event after connection', t => {
  t.plan(2)
  const opts = { ...options, 'metadata.broker.list': '127.0.0.1:9092' }
  const { promise, resolve } = Promise.withResolvers()
  const consumer = new Consumer(opts, log, (err) => {
    t.assert.ok(!err)
    consumer.consumer.emit('event.error', new Error('Test Error'))
  })
  consumer.on('error', (s) => {
    t.assert.ok(s)
    resolve()
  })
  t.after(() => {
    consumer.stop()
  })
  return promise
})

test('empty message with data event', t => {
  t.plan(3)
  const opts = { ...options, 'metadata.broker.list': '127.0.0.1:9092' }
  const { promise, resolve } = Promise.withResolvers()
  const consumer = new Consumer(opts, log, (err) => {
    t.assert.ok(!err)
    t.assert.throws(() => consumer.consumer.emit('data'))
  })
  consumer.on('error', (s) => {
    t.assert.ok(s)
    resolve()
  })
  t.after(() => {
    consumer.stop()
  })
  return promise
})
