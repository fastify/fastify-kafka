'use strict'

const EE = require('node:events').EventEmitter
const inherits = require('node:util').inherits
const { Producer: KafkaProducer, stringSerializers } = require('@platformatic/kafka')

function Producer (opts, log, next, topicConf) {
  this._log = log
  this._producer = null

  EE.call(this)

  try {
    const producerOpts = Object.assign({}, opts, topicConf || {}, {
      serializers: stringSerializers
    })
    this._producer = new KafkaProducer(producerOpts)
    this._log.debug('kafka-producer:ready')
    next()
  } catch (err) {
    this._log.debug('kafka-producer:init-error', err)
    next(err)
  }
}

inherits(Producer, EE)

Producer.prototype.push = async function push (message) {
  this._log.debug('kafka-producer:pushing message', message)

  try {
    const key = (message.key !== null && message.key !== undefined)
      ? String(message.key)
      : null

    await this._producer.send({
      messages: [
        {
          topic: message.topic,
          key,
          value: message.payload,
          partition: message.partition !== null ? message.partition : undefined
        }
      ]
    })
    return this
  } catch (err) {
    this._log.error({ err }, 'kafka-producer:push-error')
    this.emit('error', err)
    throw err
  }
}

Producer.prototype.stop = function stop (done) {
  this._log.debug('kafka-producer:stopping')

  if (!this._producer) {
    if (typeof done === 'function') {
      done()
    }
    return this
  }

  this._producer.close()
    .then(() => {
      if (typeof done === 'function') {
        done()
      }
    })
    .catch(err => {
      if (typeof done === 'function') {
        done(err)
      }
    })

  return this
}

module.exports = Producer
