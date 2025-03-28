# @fastify/kafka

[![CI](https://github.com/fastify/fastify-kafka/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/fastify/fastify-kafka/actions/workflows/ci.yml)
[![NPM version](https://img.shields.io/npm/v/@fastify/kafka.svg?style=flat)](https://www.npmjs.com/package/@fastify/kafka)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-brightgreen?style=flat)](https://github.com/neostandard/neostandard)

Fastify plugin to interact with [Apache Kafka](http://kafka.apache.org/), supporting Kafka producers and consumers.
To achieve the best performance, the plugin uses [`node-rdkafka`](https://github.com/Blizzard/node-rdkafka).

### Install

```
npm i @fastify/kafka
```

### Compatibility
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

### Usage

```js
const crypto = require('node:crypto')
const fastify = require('fastify')()
const group = crypto.randomBytes(20).toString('hex')

fastify
  .register(require('@fastify/kafka'), {
    producer: {
      'metadata.broker.list': '127.0.0.1:9092',
      'fetch.wait.max.ms': 10,
      'fetch.error.backoff.ms': 50,
      'dr_cb': true
    },
    consumer: {
      'metadata.broker.list': '127.0.0.1:9092',
      'group.id': group,
      'fetch.wait.max.ms': 10,
      'fetch.error.backoff.ms': 50,
      'auto.offset.reset': 'earliest'
    }
  })

fastify.post('/data', (req, reply) => {
  fastify.kafka.push({
    topic: 'updates',
    payload: req.body,
    key: 'dataKey'
  })
})

fastify.kafka.subscribe('updates')
fastify.kafka.on('updates', (msg, commit) => {
  console.log(msg.value.toString())
  commit()
})

fastify.listen({ port: 3000 }, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
 ```

For more examples on how to use this plugin, you can take a look at the [examples directory](./examples).

### API
This module exposes the following APIs:
##### Producer
- `fastify.kafka.producer`: the producer instance
- `fastify.kafka.push`: utility to produce a new message

##### Consumer
- `fastify.kafka.consumer`: the consumer instance
- `fastify.kafka.consume`: utility to start the message consuming
- `fastify.kafka.subscribe`: utility to begin subscribing to one or more topics
- `fastify.kafka.on`: topic listener

## Acknowledgments

This project is kindly sponsored by:
- [LetzDoIt](https://www.letzdoitapp.com/)

## License

Licensed under [MIT](./LICENSE).
