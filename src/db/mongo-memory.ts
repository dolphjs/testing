export interface MongoMemoryTestServer {
    uri: string;
    stop: () => Promise<void>;
}

/**
 * Spins up a real, ephemeral MongoDB instance in-process for tests — no
 * mocked driver, no shared dev database. Pass `.uri` to `mongoose.connect()`
 * (or `autoInitMongo({ url: uri })`) in your test setup, and `.stop()` in
 * teardown. Requires `mongodb-memory-server` in the consuming app; lazily
 * required so apps that don't use Mongoose never pay to resolve it.
 */
export async function createMongoMemoryTestServer(): Promise<MongoMemoryTestServer> {
    let MongoMemoryServer: { create: () => Promise<any> };
    try {
        ({ MongoMemoryServer } = require('mongodb-memory-server'));
    } catch {
        throw new Error(
            '`mongodb-memory-server` is not installed. Run `npm i -D mongodb-memory-server` to use createMongoMemoryTestServer().',
        );
    }

    const server = await MongoMemoryServer.create();
    return {
        uri: server.getUri(),
        stop: () => server.stop(),
    };
}
