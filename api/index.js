const joi = require('joi');
const { object } = require('joi');

class API {
    constructor(sessionStorage) {
        this.endpoints = {};
        this.sessionStorage = sessionStorage;
    }

    call(id, session, payload) {
        return Promise.resolve()
            .then(() => {
                const endpoint = this.endpoints[id];
                if (!endpoint) { throw new Error("endpoint_not_found", { status: 404 }) }
                return endpoint
            })
            .then(endpoint => endpoint.indata.validateAsync(payload)
                .catch(err => { throw new Error("invalid_payload", { details: err, status: 400 }); })
                .then(() => endpoint.handler(new Client(session, this.sessionStorage), payload))
            )
            .catch(err => {
                if (err instanceof Error) { throw err; }
                throw new Error("internal_server_error", { details: err, status: 500 });
            });
    }

    register(id, indata = joi.valid(null), handler = handlerDefault) {
        this.endpoints[id] = { indata, handler };
    }

    describe() {
        return {
            endpoints: Object.keys(this.endpoints).reduce((s, id) => ({
                ...s,
                [id]: { indata: this.endpoints[id].indata.describe() },
            }), {})
        }
    }
}

class Error {
    constructor(id, { details = null, status = 200 }) {
        this.id = id;
        this.details = details;
        this.status = status;
    }
}

const handlerDefault = () => { throw new Error("not_implemented", { status: 500 }) };

class MemoryStorage {
    constructor(expiry = 60*60*1000) {
        this.sessions = {};
    }

    set(session, key, value) {
        return Promise.resolve()
            .then(() => {
                if (!this.sessions[session]) {
                    this.sessions[session] = { lastChange: setTimeout(() => { delete this.sessions[session] }, this.expiry), values: { [key]: value } };
                    return null;
                }
                this.sessions[session].values[key] = value;
                clearTimeout(this.sessions[session].lastChange);
                this.sessions[session].lastChange = setTimeout(() => { delete this.sessions[session] }, this.expiry);
                return null;
            });
    }

    get(session, key) {
        return Promise.resolve()
            .then(() => this.sessions[session])
            .then(v => {
                if (!v) { return null; }
                clearTimeout(v.lastChange);
                v.lastChange = setTimeout(() => { delete this.sessions[session] }, this.expiry);
                return v.values[key] || null;
            })
    }

    clear(session, key) {
        return Promise.resolve()
            .then(() => this.sessions[session])
            .then(v => {
                if (!v) { return null; }
                delete v.values[key]
                clearTimeout(v.lastChange);
                v.lastChange = setTimeout(() => { delete this.sessions[session] }, this.expiry);
                return null;
            })
    }
}

class Client {
    constructor(id, storage) {
        this.id = id;
        this.storage = storage;
    }

    set(key, value) {
        return Promise.resolve().then(() => this.storage.set(this.id, key, value));
    }

    get(key) {
        return Promise.resolve().then(() => this.storage.get(this.id, key));
    }

    clear(key) {
        return Promise.resolve().then(() => this.storage.clear(this.id, key));
    }
}

module.exports = { API, Error, MemoryStorage };
