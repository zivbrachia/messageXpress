# messageXpress
Fast, unopinionated, minimalist amqp framework for Node.js.
raw message arrived from amqp is wrapped as an http.IncommingMessage, this will help to use 99% of express middlewares already packages

all behavior will act the same as we expect from express framework;
because middleware function has the same argument as express, we can handle the same middlewares and the same flows for each route

# async / sync
fully support for async middlewares and sync middlewares

# error handling
fully support for thrown exception inside middleware.
`app.use((req, res, next) => {
    next(throw new Error('this is the end'));
})
`

`route.use((req, res, next) => {
    // this will triggers only for [YOUR_QUEUE_NAME] route
    next(new Error('this is the end'));
})`

# example
`
const app = new Application();

app.use(express.json({limit: '50Mb'})); // this will triggers for all arriving messages

const route = new RouteLayer([YOUR_QUEUE_NAME]);

route.use((req, res, next) => {
    // this will triggers only for [YOUR_QUEUE_NAME] route
    next();
})

route.action([ACTION_NAME], (req, res, next) => {
    console.log(req.body);  // will pring the message arrived from amqp
    next();
}, (req, res, next) => {
    res.json({success: true});
})

`
## listeners
all listeners is sent as a reference

`app.on('message_arrive', (rawMsg, ch, req) => {
    // TODO: what ever you want
});`

`app.on('handled', (req, res) => {
    // TODO: all data sent with res.json will be waiting in res.body;
});`

`app.on('error', (err: Error, req) => {
    // TODO: err can be of any type extends Error.
    //       this is the error middleware is sending            
})`

        

        
