'use strict'

const EE = require('events').EventEmitter
const inherits = require('util').inherits
const Kafka = require('node-rdkafka')

function Consumer (opts, log, next) {
  this._log = log
  this.producer = new Kafka.Producer(opts)
  var calledNext = false

  this.producer.once('ready', onReady.bind(this))
  this.producer.on('event.error', onError.bind(this))
  this.producer.connect({}, onConnect.bind(this))

  function onConnect (err) {
    this._log.debug('kafka-producer:onConnect', err)
    if (!calledNext) {
      calledNext = true
      return next(err)
    }
  }

  function onReady () {
    this._log.debug('kafka-producer:onReady')
    if (!calledNext) {
      calledNext = true
      return next()
    }
  }

  function onError (err) {
    this._log.debug('kafka-producer:onError', err)
    if (!calledNext) {
      calledNext = true
      return next(err)
    }
    this.emit('error', err)
  }

  EE.call(this)
}

inherits(Consumer, EE)

Consumer.prototype.push = function push (message) {
  this._log.debug('kafka-producer:push', message)
  try {
    this.producer.produce(
      message.topic,
      message.partition || null,
      Buffer.from(message.payload),
      message.key,
      Date.now()
    )
  } catch (err) {
    this._log.debug('kafka-producer:onError', err)
    this.emit('error', err)
  }
  return this
}

Consumer.prototype.stop = function stop (done) {
  this._log.debug('kafka-producer:stop')
  this.producer.disconnect(done)
  return this
}

module.exports = Consumer
