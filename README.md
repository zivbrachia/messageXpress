# messageXpress
Fast, unopinionated, minimalist amqp framework for Node.js.
raw message arrived from amqp is wrapped as an http.IncommingMessage, this will help to use 99% of express middlewares already packages

all behavior will act the same as we expect from express framework;
because middleware function has the same argument as express, we can handle the same middlewares and the same flows for each route

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

app.use(express.json({limit: '50Mb'})); // this will triggers for all arriving messages
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
    //       this is the error middleware is sending            
})
```

        

        
