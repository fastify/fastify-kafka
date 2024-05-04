'use strict'

const { test } = require('tap')
const log = require('abstract-logging')

const Producer = require('../lib/producer')

const options = {
  'metadata.broker.list': '192.0.2.1:9092',
  'socket.timeout.ms': 10,
  dr_cb: true
}

test('unreachable brokers', t => {
  t.plan(1)
  const producer = new Producer(options, log, (err) => {
    t.ok(err)
  }, {}, { timeout: 200 })
})

test('error event before connection', t => {
  t.plan(1)
  const producer = new Producer(options, log, (err) => {
    t.ok(err)
  }, {}, { timeout: 200 })
  producer.producer.emit('event.error', new Error('Test Error'))
})

test('error event after connection', t => {
  t.plan(3)
  const opts = { ...options, 'metadata.broker.list': '127.0.0.1:9092' }
  const producer = new Producer(opts, log, (err) => {
    t.error(err)
    producer.producer.emit('event.error', new Error('Test Error'))
  })
  producer.on('error', (e) => {
    t.ok(e)
  })
  producer.push({
    topic: 'test',
    payload: 'hello world!',
    key: 'testKey'
  })
  t.after(() => {
    producer.stop()
  })
})
