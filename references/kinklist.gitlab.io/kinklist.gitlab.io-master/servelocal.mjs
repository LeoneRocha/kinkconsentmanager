// @ts-check
import express, { static as serveStatic } from 'express';
import nocache from 'nocache';
import { resolve } from 'path';
const port = process.env.PORT || 8080;
const app = express();

app.use(nocache());

// serve static assets normally
app.use(serveStatic(resolve('./public')));

// handle every other route with index.html, which will contain
// a script tag to your application's JavaScript file(s).
app.get('*meow', function (request, response) {
  response.sendFile(resolve('./public/index.html'));
});

app.listen(port);
console.log("server started on port " + port);