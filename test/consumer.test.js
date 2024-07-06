'use strict'

const { test } = require('tap')
const log = require('abstract-logging')

const Consumer = require('../lib/consumer')

const options = {
  'metadata.broker.list': '192.0.2.1:9092',
  'fetch.wait.max.ms': 10,
  'fetch.error.backoff.ms': 50,
  'group.id': 'new-group-id'
}

test('unreachable brokers', t => {
  t.plan(1)
  const consumer = new Consumer(options, log, (err) => {
    t.ok(err)
  }, {}, { timeout: 200 })
  consumer.on('ready', (e) => {
    t.error(e)
  })
})

test('error event before connection', t => {
  t.plan(1)
  const consumer = new Consumer(options, log, (err) => {
    t.ok(err)
  }, {}, { timeout: 200 })
  consumer.consumer.emit('event.error', new Error('Test Error'))
})

test('error event after connection', t => {
  t.plan(2)
  const opts = { ...options, 'metadata.broker.list': '127.0.0.1:9092' }
  const consumer = new Consumer(opts, log, (err) => {
    t.error(err)
    consumer.consumer.emit('event.error', new Error('Test Error'))
  })
  consumer.on('error', (s) => {
    t.ok(s)
  })
  t.after(() => {
    consumer.stop()
  })
})

test('empty message with data event', t => {
  t.plan(3)
  const opts = { ...options, 'metadata.broker.list': '127.0.0.1:9092' }
  const consumer = new Consumer(opts, log, (err) => {
    t.error(err)
    t.throws(() => consumer.consumer.emit('data'))
  })
  consumer.on('error', (s) => {
    t.ok(s)
  })
  t.after(() => {
    consumer.stop()
  })
})
