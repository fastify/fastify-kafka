import { FastifyPluginCallback } from 'fastify'
import {
  Consumer,
  Producer,
} from '@platformatic/kafka'

declare module 'fastify' {
  interface FastifyKafkaMessage {
    topic: string;
    partition?: number;
    key?: string | null;
    payload: unknown;
  }

  interface FastifyKafkaProducer {
    producer: Producer;
    push(message: FastifyKafkaMessage): Promise<FastifyKafkaProducer>;
    stop(done: (err?: Error) => void): void;
  }

  interface FastifyKafkaConsumer {
    consumer: Consumer;
    consume(value?: number, cbk?: (err: Error | null, messages: unknown[]) => void): void;
    subscribe(topic: string | string[]): FastifyKafkaConsumer;
    stop(done: (err?: Error) => void): void;
  }

  interface Kafka {
    producer?: FastifyKafkaProducer;
    consumer?: FastifyKafkaConsumer;
    push(message: FastifyKafkaMessage): void;
    consume(value?: number, cbk?: (err: Error | null, messages: unknown[]) => void): void;
    subscribe(topic: string | string[]): FastifyKafkaConsumer;
    on(event: string, listener: (...args: unknown[]) => void): FastifyKafkaConsumer;
  }

  interface FastifyInstance {
    kafka: Kafka;
  }
}

type FastifyKafka = FastifyPluginCallback<fastifyKafka.FastifyKafkaOptions>

declare namespace fastifyKafka {
  export interface FastifyKafkaOptions {
    producer?: Record<string, unknown>;
    consumer?: Record<string, unknown>;
    producerTopicConf?: Record<string, unknown>;
    consumerTopicConf?: Record<string, unknown>;
    metadataOptions?: Record<string, unknown>;
  }

  export const fastifyKafka: FastifyKafka
  export { fastifyKafka as default }
}

declare function fastifyKafka (...params: Parameters<FastifyKafka>): ReturnType<FastifyKafka>
export = fastifyKafka
