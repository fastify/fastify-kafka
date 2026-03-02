import Fastify, { FastifyKafkaConsumer, FastifyKafkaProducer, Kafka } from 'fastify'
import { expectAssignable } from 'tsd'
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
expectAssignable<Kafka>(app.kafka)
expectAssignable<FastifyKafkaProducer | undefined>(app.kafka.producer)
expectAssignable<FastifyKafkaConsumer | undefined>(app.kafka.consumer)
expectAssignable<Function>(app.kafka.push)
expectAssignable<Function>(app.kafka.consume)
expectAssignable<Function>(app.kafka.subscribe)
