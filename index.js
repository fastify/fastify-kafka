'use strict'

const fp = require('fastify-plugin')
const Producer = require('./lib/producer')
const Consumer = require('./lib/consumer')

function fastifyKafka (fastify, opts, next) {
  fastify.decorate('kafka', {})

  if (opts.producer) {
    fastify.register(fp(buildProducer), opts.producer)
  }

  if (opts.consumer) {
    fastify.register(fp(buildConsumer), opts.consumer)
  }

  next()
}

function buildProducer (fastify, opts, next) {
  const producer = new Producer(opts, fastify.logger, next)
  fastify.kafka.producer = producer
  fastify.kafka.push = producer.push.bind(producer)

  fastify.addHook('onClose', onClose)
  function onClose (fastify, done) {
    producer.stop(done)
  }
}

function buildConsumer (fastify, opts, next) {
  const consumer = new Consumer(opts, fastify.logger, next)
  fastify.kafka.consumer = consumer
  fastify.kafka.consume = consumer.consume.bind(consumer)
  fastify.kafka.on = registerSubscription

  function registerSubscription (topic, cb) {
    consumer.subscribe(topic)
    consumer.on(topic, cb)
    return consumer
  }

  fastify.addHook('onClose', onClose)
  function onClose (fastify, done) {
    consumer.stop(done)
  }
}

module.exports = fp(fastifyKafka, '>=0.30.0')
