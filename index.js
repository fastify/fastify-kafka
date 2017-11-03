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
  const log = fastify.logger
  fastify.kafka.producer = new Producer(opts, log, next)
  fastify.kafka.push = push

  function push (message) {
    fastify.kafka.producer.push(message)
  }

  fastify.addHook('onClose', onClose)
  function onClose (fastify, done) {
    fastify.kafka.producer.stop(done)
  }
}

function buildConsumer (fastify, opts, next) {
  const log = fastify.logger
  fastify.kafka.consumer = new Consumer(opts, log, next)
  fastify.kafka.on = registerSubscription

  function registerSubscription (topic, cb) {
    fastify.kafka.consumer.subscribe(topic)
    fastify.kafka.consumer.on(topic, cb)
  }

  fastify.addHook('onClose', onClose)
  function onClose (fastify, done) {
    fastify.kafka.consumer.stop(done)
  }
}

module.exports = fp(fastifyKafka, '>=0.30.0')
