import Fastify, { FastifyKafkaConsumer, FastifyKafkaProducer, Kafka } from 'fastify'
import { expect } from 'tstyche'
import fastifyKafka from '..'

const app = Fastify()
app.register(fastifyKafka, {
  producer: {
    'metadata.broker.list': '127.0.0.1:9092',
    dr_cb: true
  },
  consumer: {
    'metadata.broker.list': '127.0.0.1:9092',
    'group.id': 'new-group-1',
    'fetch.wait.max.ms': 10,
    'fetch.error.backoff.ms': 50,
  },
  consumerTopicConf: {
    'auto.offset.reset': 'earliest'
  },
  producerTopicConf: {
    'request.timeout.ms': 10
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
