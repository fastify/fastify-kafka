'use strict'

const crypto = require('crypto')
const fastifyKafka = require('..')
const fastify = require('fastify')

const groupId = crypto.randomBytes(20).toString('hex')
const logger = { level: 'debug' }
const consumerOptions = {
  consumer: {
    'metadata.broker.list': '127.0.0.1:9092',
    'group.id': groupId,
    'fetch.wait.max.ms': 10,
    'topic.metadata.refresh.interval.ms': 1000,
    'fetch.error.backoff.ms': 50
  },
  consumerTopicConf: {
    'auto.offset.reset': 'earliest'
  }
}

const producerOptions = {
  producer: {
    'metadata.broker.list': '127.0.0.1:9092',
    dr_cb: true
  }
}

const petConsumer = fastify({ logger })
  .register(fastifyKafka, consumerOptions)
  .after(err => {
    if (err) throw err

    petConsumer.kafka.subscribe(['cats', 'dogs'])
      .on('cats', (msg, commit) => {
        petConsumer.log.info('received message in cats topic: %s', msg.value.toString())
        commit()
      })
      .on('dogs', (msg, commit) => {
        petConsumer.log.info('received message in dogs topic: %s', msg.value.toString())
        commit()
      })

    petConsumer.kafka.consume()
  })

const plantConsumer = fastify({ logger })
  .register(fastifyKafka, consumerOptions)
  .after(err => {
    if (err) throw err

    plantConsumer.kafka.subscribe('flowers')
      .on('flowers', (msg, commit) => {
        plantConsumer.log.info('received message in flowers topic: %s', msg.value.toString())
        commit()
      })

    plantConsumer.kafka.consume()
  })

const producer = fastify({ logger })
  .register(fastifyKafka, producerOptions)
  .after(err => {
    if (err) throw err

    producer.kafka.push({
      topic: 'cats',
      payload: 'message about cats',
      key: 'testKey'
    })
    producer.kafka.push({
      topic: 'dogs',
      payload: 'message about dogs',
      key: 'testKey'
    })
    producer.kafka.push({
      topic: 'flowers',
      payload: 'message about flowers',
      key: 'testKey'
    })
  })

producer.ready(err => {
  if (err) throw err

  petConsumer.ready(err => {
    if (err) throw err
  })
  plantConsumer.ready(err => {
    if (err) throw err
  })
})
