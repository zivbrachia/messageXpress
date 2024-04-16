# messageXpress
Fast, unopinionated, minimalist amqp framework for Node.js.
raw message arrived from amqp is wrapped as an http.IncommingMessage, this will help to use 99% of express middlewares already packages

all behavior will act the same as we expect from express framework;
because middleware function has the same argument as express, we can handle the same middlewares and the same flows for each route

## Advantages working with middlewares:
* **Modular and Reusable**: Middleware functions can be modularized and reused across different routes or applications, promoting code reusability and maintainability.

* **Separation of Concerns**: Middleware helps separate concerns by allowing developers to encapsulate cross-cutting functionalities such as authentication, logging, error handling, and input validation in separate middleware functions. This promotes cleaner and more maintainable code.

* **Flexibility**: Middleware provides flexibility in defining the request-response pipeline. Developers can add, remove, or modify middleware functions to customize the behavior of the application according to specific requirements.

* **Chainable**: Middleware functions can be chained together, allowing developers to create complex processing pipelines. Each middleware function in the chain can perform specific tasks independently without tightly coupling them to each other.

* **Asynchronous Support**: Express middleware supports asynchronous operations, enabling developers to perform asynchronous tasks such as database queries, API calls, and file I/O operations within middleware functions.

## Best practices for using middleware:

1. **Use Modular Middleware**: Instead of defining all middleware in a single file, consider breaking them down into modular units based on functionality. This helps maintain a clean and organized codebase.
2. **Order Matters**: The order in which middleware is defined matters because middleware functions are executed sequentially in the order they are defined. Ensure that middleware functions are arranged in the correct order based on the intended behavior.
3. **Use Built-in Middleware**: Express provides built-in middleware functions for common tasks such as parsing incoming requests, serving static files, and handling errors. Utilize these built-in middleware functions whenever possible to reduce boilerplate code and improve performance.
4. **Keep Middleware Lightweight**: Keep middleware functions lightweight and focused on a specific task. Avoid adding unnecessary logic or performing heavy computations within middleware functions to maintain optimal performance.
5. **Use Middleware Libraries**: Utilize third-party middleware libraries when they provide functionality that meets your requirements. However, carefully review and vet third-party middleware libraries to ensure they are well-maintained, secure, and compatible with your application.
6. **Use Middleware for Cross-cutting Concerns**: Middleware functions are suitable for implementing cross-cutting concerns such as logging, authentication, authorization, input validation, and error handling. Separating these concerns into middleware functions helps keep route handlers clean and focused on business logic.
7. **Avoid Blocking Operations**: Avoid performing blocking operations within middleware functions, such as synchronous I/O operations or long-running computations, as it can degrade the performance and scalability of your application. Instead, use asynchronous operations or delegate blocking tasks to worker threads or external services.

# async / sync
fully support for async middlewares and sync middlewares

# error handling
fully support for thrown exception inside middleware.
```js
app.use((req, res, next) => {
    next(throw new Error('this is the end'));
})
```

```js
route.use((req, res, next) => {
    // this will triggers only for [YOUR_QUEUE_NAME] route
    next(new Error('this is the end'));
})
```

# example

```json
{
  "action": "some_action_name",
  "payload": {}
}
```

```js
import express from 'express';
import amqp from 'amqplib';
import {Application, RouteLayer} from "messageXpress";
import { v4 as uuidv4 } from 'uuid'; // for example

// Declare the queue
const queueName = 'your_queue_name';

const app = new Application();

// subscribe to Application listeners
app.on('message_arrive', (rawMsg, ch, req) => {
  console.log(`Received, from: ${rawMsg.fields.routingKey}, size: ${Buffer.byteLength(rawMsg.content.toString().trim(), 'utf-8')}`)
});

app.on('handled', (req, res) => {
  console.log('handled', req.uid, req.body, res.body);
});

app.on('error', (err: Error, req) => {
    console.error(`failed handle message, reason:${err.message}`, req);
})

app.use(express.json({limit: '2Mb'})); // this will triggers for all arriving messages
app.use((req, res, next) => {
  req.uid = uuidv4(); // ⇨ '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
  next();
})

const route = new RouteLayer(queueName);

route.use((req, res, next) => {
    // this will triggers only for 'your_queue_name' route
    console.log(req.uid);
    next();
})

route.action('some_action_name', (req, res, next) => {
    console.log(req.body);  // will pring the message arrived from amqp
    const someDataToReturn = {}
    next();
}, (req, res, next) => {
    res.json({success: true, ...someDataToReturn});
})

app.use(route);

// create consume for amqp queue;
const connection = await amqp.connect('amqp://localhost');

// Create a channel
const channel = await connection.createChannel();

await channel.assertQueue(queueName, { durable: true });

// Consume messages from the queue
await channel.consume(queueName, async (message) => {
  try {
    // Process the message using the app's handle method
    await app.handle(message, channel);

    // Acknowledge the message if noAck is false
    if (!channel.noAck) {
      channel.ack(message);
    }
  } catch (err) {
    // Reject the message if noAck is false
    if (!channel.noAck) {
      channel.nack(message);
    }
  }
}, { noAck: true }); // Set noAck to true or false as needed

```
## listeners
all listeners is sent as a reference

```js
app.on('message_arrive', (rawMsg, ch, req) => {
    // TODO: what ever you want
});
```

```js
app.on('handled', (req, res) => {
    // TODO: all data sent with res.json will be waiting in res.body;
});
```

```js
app.on('error', (err: Error, req) => {
    // TODO: err can be of any type extends Error.
    //       this is the error middleware is throwing by using:         
    //       next(new Error('this is an error'));
})
```

        

        
