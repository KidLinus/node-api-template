const joi = require('joi');
const express = require('express');
const { API, MemoryStorage } = require('./api');
const { router } = require('./api/express');

const api = new API(new MemoryStorage());
api.register("account_create", joi.object({ email: joi.string().email().required() }), (client, req) => req);

const server = express();
server.use("/api", router(api));
server.get("/", (req, res) => res.json({ hello: "world" }));
server.listen(8080, () => console.log("server running"));
