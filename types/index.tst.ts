import Fastify, { FastifyKafkaConsumer, FastifyKafkaProducer, Kafka } from 'fastify'
import { expect } from 'tstyche'
import fastifyKafka from '..'

const app = Fastify()

app.register(fastifyKafka, {
  producer: {
    bootstrapBrokers: ['127.0.0.1:9092'],
    drCb: true,
    queueBufferingMaxMessages: 100000
  },
  consumer: {
    bootstrapBrokers: ['127.0.0.1:9092'],
    groupId: 'new-group-1',
    fetchWaitMaxMs: 10,
    fetchErrorBackoffMs: 50,
    enableAutoCommit: true
  },
  consumerTopicConf: {
    autoOffsetReset: 'earliest'
  },
  producerTopicConf: {
    requestTimeoutMs: 10
  },
  metadataOptions: {
    timeout: 1000
  }
})

// Check whether all properties are merged successfully or not
expect(app.kafka).type.toBeAssignableTo<Kafka>()
expect(app.kafka.producer).type.toBeAssignableTo<FastifyKafkaProducer | undefined>()
expect(app.kafka.consumer).type.toBeAssignableTo<FastifyKafkaConsumer | undefined>()
expect(app.kafka.push).type.toBeAssignableTo<Function>()
expect(app.kafka.consume).type.toBeAssignableTo<Function>()
expect(app.kafka.subscribe).type.toBeAssignableTo<Function>()
