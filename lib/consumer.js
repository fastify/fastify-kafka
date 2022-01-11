'use strict'

const EE = require('events').EventEmitter
const inherits = require('util').inherits
const Kafka = require('node-rdkafka')

function Consumer (opts, log, next, topicConf, metadataOptions) {
  this._log = log
  this.consumer = new Kafka.KafkaConsumer(opts, topicConf || {})
  let calledNext = false

  this.consumer.once('ready', onReady.bind(this))
  this.consumer.on('event.error', onError.bind(this))
  this.consumer.connect(metadataOptions || {}, onConnect.bind(this))

  // register the handler only if the developer doesn't use
  // the callback provided on `consume` invocation
  if (!opts.event_cb) {
    this.consumer.on('data', onData.bind(this))
  }

  function onConnect (err) {
    this._log.debug('kafka-consumer:onConnect', err)
    if (!calledNext) {
      calledNext = true
      return next(err)
    }
  }

  function onReady () {
    this._log.debug('kafka-consumer:onReady')
    if (!calledNext) {
      calledNext = true
      return next()
    }
  }

  function onError (err) {
    this._log.debug('kafka-consumer:onError', err)
    if (!calledNext) {
      calledNext = true
      return next(err)
    }
    this.emit('error', err)
  }

  function onData (msg) {
    this._log.debug('kafka-consumer:onData', msg)
    try {
      this.emit(msg.topic, msg, commit.bind(this, msg))
    } catch (err) {
      this._log.debug('kafka-consumer:onError', err)
      this.emit('error', err)
      commit.call(this, msg)
    }
  }

  function commit (msg) {
    this._log.debug('kafka-consumer:commit', msg)
    this.consumer.commitMessage(msg)
  }

  EE.call(this)
}

inherits(Consumer, EE)

Consumer.prototype.stop = function stop (done) {
  this._log.debug('kafka-consumer:stop')
  this.consumer.unsubscribe()
  this.consumer.disconnect(done)
  return this
}

Consumer.prototype.subscribe = function subscribe (topic) {
  this._log.debug('kafka-consumer:subscribe', topic)
  this.consumer.subscribe(Array.isArray(topic) ? topic : [topic])
  return this
}

Consumer.prototype.consume = function consume (value, cbk) {
  this._log.debug('kafka-consumer:consume', value)
  this.consumer.consume(value, cbk)
  return this
}

module.exports = Consumer
