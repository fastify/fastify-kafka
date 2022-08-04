import Fastify, { FastifyKafkaConsumer, FastifyKafkaProducer, Kafka } from 'fastify';
import { expectAssignable } from 'tsd';
import fastifyKafka from '..';

const app = Fastify()

app.register(fastifyKafka, {
    producer: {
        'metadata.broker.list': '127.0.0.1:9092',
        dr_cb: true
    },
    consumer: {
        'metadata.broker.list': '127.0.0.1:9092',
        'group.id': "new-group-1",
        'fetch.wait.max.ms': 10,
        'fetch.error.backoff.ms': 50,
    },
    consumerTopicConf: {
        'auto.offset.reset': 'earliest'
    },
    producerTopicConf: {
        "request.timeout.ms": 10
    },
    metadataOptions: {
        timeout: 1000
    }
});

// Check whether all properties are merged successfully or not
expectAssignable<Kafka>(app.kafka)
expectAssignable<FastifyKafkaProducer | undefined>(app.kafka.producer)
expectAssignable<FastifyKafkaConsumer | undefined>(app.kafka.consumer)
expectAssignable<Function>(app.kafka.push)
expectAssignable<Function>(app.kafka.consume)
expectAssignable<Function>(app.kafka.subscribe)
