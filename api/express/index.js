const express = require("express");
const cors = require('cors');
const crypto = require("crypto");
const { Error } = require('../');

const middlewareBody = (req, res, next) => {
    if (!req.is('application/json')) {
        req.body = null;
        return next();
    }
    let body = "";
    req.on('data', (chunk) => body += chunk)
    req.on('end', () => {
        try {
            req.body = JSON.parse(body);
        } catch (err) {
            res.status(400).json(new Error("invalid_json", { details: err, status: 400 }));
            return
        }
        next();
    });
}

const middlewareCookies = (req, res, next) => {
    req.cookies = req.headers.cookie ? req.headers.cookie.split(';').reduce((s, v) => {
        const parts = v.split("=");
        const key = parts.shift();
        const value = parts.join('=').trim();
        return { ...s, [key]: value };
    }, {}) : {};
    next();
}

const middlewareSession = (req, res, next) => {
    const session = req.cookies.session || generateSessionID();
    res.cookie("session", session, { httpOnly: true });
    next();
};

const corsOptions = {
    origin: 'http://localhost:8080',
    credentials: true,
};

const router = (api) => {
    const router = express.Router();
    router.use(cors(corsOptions));
    router.get("/", (req, res) => res.json(api.describe()))
    router.post("/:id", middlewareCookies, middlewareBody, middlewareSession, (req, res) => api.call(req.params.id, null, req.body)
        .then(data => res.json({ data, cookies: req.cookies }))
        .catch(error => res.status(error.status || 200).json({ error }))
    )
    return router;
};

const generateSessionID = () => crypto.randomBytes(16).toString("hex");

module.exports = { router };
