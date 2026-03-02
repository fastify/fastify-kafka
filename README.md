# @fastify/kafka

[![CI](https://github.com/fastify/fastify-kafka/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/fastify/fastify-kafka/actions/workflows/ci.yml)
[![NPM version](https://img.shields.io/npm/v/@fastify/kafka.svg?style=flat)](https://www.npmjs.com/package/@fastify/kafka)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-brightgreen?style=flat)](https://github.com/neostandard/neostandard)

Fastify plugin to interact with [Apache Kafka](http://kafka.apache.org/), supporting Kafka producers and consumers.
To achieve the best performance, the plugin uses [`@platformatic/kafka`](https://github.com/platformatic/kafka).

## Install

```
npm i @fastify/kafka
```

## Compatibility

| Plugin version | Fastify version |
| ---------------|-----------------|
| `>=3.x`        | `^5.x`          |
| `>=0.x <3.x`   | `^4.x`          |
| `>=0.x <3.x`   | `^3.x`          |
| `>=0.x <3.x`   | `^2.x`          |
| `>=0.x <3.x`   | `^1.x`          |

Please note that if a Fastify version is out of support, then so are the corresponding versions of this plugin
in the table above.
See [Fastify's LTS policy](https://github.com/fastify/fastify/blob/main/docs/Reference/LTS.md) for more details.

## Usage

```js
const crypto = require('node:crypto')
const fastify = require('fastify')()
const group = crypto.randomBytes(20).toString('hex')

fastify
  .register(require('@fastify/kafka'), {
    producer: {
      bootstrapBrokers: ['127.0.0.1:9092'],
      clientId: 'my-producer',
      allowAutoTopicCreation: true
    },
    consumer: {
      bootstrapBrokers: ['127.0.0.1:9092'],
      groupId: group,
      clientId: 'my-consumer',
      allowAutoTopicCreation: true
    }
  })

fastify.post('/data', (req, reply) => {
  fastify.kafka.push({
    topic: 'updates',
    payload: req.body,
    key: 'dataKey'
  })
  reply.send({ ok: true })
})

fastify.kafka.subscribe('updates')
fastify.kafka.on('updates', (msg, commit) => {
  console.log(msg.value.toString())
  commit()
})

fastify.listen({ port: 3000 }, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
  fastify.kafka.consume()
})
```

For more examples on how to use this plugin, you can take a look at the [examples directory](./examples).

## Migration from `node-rdkafka`

Starting from version `3.x`, this plugin uses [`@platformatic/kafka`](https://github.com/platformatic/kafka) instead of `node-rdkafka`.

The main differences in the configuration options are:

| `node-rdkafka` (old)            | `@platformatic/kafka` (new)       |
|---------------------------------|-----------------------------------|
| `metadata.broker.list`          | `bootstrapBrokers: ['host:port']` |
| `group.id`                      | `groupId`                         |
| `fetch.wait.max.ms`             | `maxWaitTime`                     |
| `enable.auto.commit`            | `autocommit`                      |
| `auto.offset.reset`             | passed via `consumerTopicConf`    |
| `dr_cb`                         | not needed                        |

## API

This module exposes the following APIs:

### Plugin options

```ts
{
  producer?: Record<string, unknown>       // @platformatic/kafka Producer options
  consumer?: Record<string, unknown>       // @platformatic/kafka Consumer options
  producerTopicConf?: Record<string, unknown>
  consumerTopicConf?: Record<string, unknown>
  metadataOptions?: Record<string, unknown>
}
```

### Producer

- `fastify.kafka.producer` — the producer instance
- `fastify.kafka.push(message)` — send a message to a topic

```js
fastify.kafka.push({
  topic: 'my-topic',   // required
  payload: 'hello',    // required - string or Buffer
  key: 'myKey',        // optional
  partition: 0         // optional
})
```

### Consumer

- `fastify.kafka.consumer` — the consumer instance
- `fastify.kafka.subscribe(topic | topic[])` — subscribe to one or more topics
- `fastify.kafka.consume()` — start streaming messages (flow mode)
- `fastify.kafka.consume(n, callback)` — fetch exactly `n` messages (batch mode)
- `fastify.kafka.on(topic, handler)` — listen for messages on a specific topic

```js
// Flow mode
fastify.kafka.subscribe(['topic-a', 'topic-b'])
fastify.kafka.on('topic-a', (msg, commit) => {
  console.log(msg.value.toString())
  commit() // manually commit the offset
})
fastify.kafka.consume()

// Batch mode
fastify.kafka.subscribe('topic-a')
fastify.kafka.consume(10, (err, messages) => {
  if (err) throw err
  messages.forEach(msg => console.log(msg.value.toString()))
})
```

## Acknowledgments

This project is kindly sponsored by:

- [LetzDoIt](https://www.letzdoitapp.com/)
- [Platformatic](https://platformatic.dev/)

## License

Licensed under [MIT](./LICENSE).
