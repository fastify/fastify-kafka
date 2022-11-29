'use strict'

const fp = require('fastify-plugin')
const Producer = require('./lib/producer')
const Consumer = require('./lib/consumer')

function fastifyKafka (fastify, opts, next) {
  fastify.decorate('kafka', {})

  if (opts.producer) {
    fastify.register(fp(buildProducer), opts)
  }

  if (opts.consumer) {
    fastify.register(fp(buildConsumer), opts)
  }

  next()
}

function buildProducer (fastify, opts, next) {
  const producer = new Producer(opts.producer, fastify.log, next, opts.producerTopicConf, opts.metadataOptions)
  fastify.kafka.producer = producer
  fastify.kafka.push = producer.push.bind(producer)

  fastify.addHook('onClose', onClose)
  function onClose (fastify, done) {
    fastify.kafka.producer.stop(done)
  }
}

function buildConsumer (fastify, opts, next) {
  const consumer = new Consumer(opts.consumer, fastify.log, next, opts.consumerTopicConf, opts.metadataOptions)
  fastify.kafka.consumer = consumer
  fastify.kafka.consume = consumer.consume.bind(consumer)
  fastify.kafka.subscribe = consumer.subscribe.bind(consumer)
  fastify.kafka.on = consumer.on.bind(consumer)

  fastify.addHook('onClose', onClose)
  function onClose (fastify, done) {
    fastify.kafka.consumer.stop(done)
  }
}

module.exports = fp(fastifyKafka, {
  fastify: '>=3',
  name: '@fastify/kafka'
})
module.exports.default = fastifyKafka
module.exports.fastifyKafka = fastifyKafka
