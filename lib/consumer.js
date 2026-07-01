'use strict'

const EE = require('node:events').EventEmitter
const inherits = require('node:util').inherits
const { Consumer: KafkaConsumer } = require('@platformatic/kafka')

function Consumer (opts, log, next, topicConf) {
  this._log = log
  this._consumer = null
  this._stream = null
  this._running = false
  this._subscriptions = []

  EE.call(this)

  try {
    const consumerOpts = Object.assign({}, opts, topicConf || {})
    this._consumer = new KafkaConsumer(consumerOpts)
    this._log.debug('kafka-consumer:ready')
    next()
  } catch (err) {
    this._log.debug('kafka-consumer:init-error', err)
    next(err)
  }
}

inherits(Consumer, EE)

Consumer.prototype.subscribe = function subscribe (topic) {
  const topics = Array.isArray(topic) ? topic : [topic]
  this._log.debug('kafka-consumer:subscribe', topics)
  this._subscriptions = topics
  return this
}

Consumer.prototype.consume = function consume (value, cbk) {
  this._log.debug('kafka-consumer:consume', value)

  if (typeof value === 'number' && typeof cbk === 'function') {
    this._consumeBatch(value, cbk)
    return this
  }

  if (this._running) {
    return this
  }
  this._running = true

  this._startStreaming().catch(err => {
    this._log.debug('kafka-consumer:stream-error', err)
    this.emit('error', err)
  })

  return this
}

Consumer.prototype._consumeBatch = async function (maxMessages, cbk) {
  let stream = null
  let timeoutId = null
  const messages = []

  const cleanup = async () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (stream) {
      await stream.close().catch(() => {})
      stream = null
    }
  }

  try {
    stream = await this._consumer.consume({
      topics: this._subscriptions,
      autocommit: false
    })

    const timeoutPromise = new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('kafka-consumer:batch-timeout'))
      }, this._batchTimeout || 5000)
    })

    const collectMessages = async () => {
      const iterator = stream[Symbol.asyncIterator]()
      try {
        while (messages.length < maxMessages) {
          const { value: msg, done } = await iterator.next()
          if (done) {
            break
          }
          messages.push(msg)
        }
      } finally {
        await iterator.return?.()
      }
    }

    await Promise.race([collectMessages(), timeoutPromise])

    await cleanup()
    cbk(null, messages)
  } catch (err) {
    this._log.debug('kafka-consumer:batch-error', err)
    await cleanup()
    cbk(err, [])
  }
}

Consumer.prototype._startStreaming = async function () {
  this._stream = await this._consumer.consume({
    topics: this._subscriptions,
    autocommit: false
  })

  for await (const msg of this._stream) {
    if (!this._running) {
      break
    }
    this._log.debug('kafka-consumer:onData', msg)

    try {
      this.emit(msg.topic, msg, () => this._commitMessage(msg))
    } catch (err) {
      this._log.debug('kafka-consumer:handler-error', err)
      this.emit('error', err)
    }
  }
}

Consumer.prototype._commitMessage = function (msg) {
  this._log.debug('kafka-consumer:commit', msg)
  this._consumer.commit({
    offsets: [
      {
        topic: msg.topic,
        partition: msg.partition,
        offset: msg.offset
      }
    ]
  }).catch(err => {
    this._log.debug('kafka-consumer:commit-error', err)
    this.emit('error', err)
  })
}

Consumer.prototype.stop = function stop (done) {
  this._log.debug('kafka-consumer:stop')
  this._running = false

  const performStop = async () => {
    if (this._stream) {
      await this._stream.close()
      this._stream = null
    }
    if (this._consumer) {
      await this._consumer.close()
    }
  }

  performStop()
    .then(() => {
      if (typeof done === 'function') {
        done()
      }
    })
    .catch(err => {
      this._log.error(err, 'Error during stop')
      if (typeof done === 'function') {
        done(err)
      }
    })

  return this
}

module.exports = Consumer
