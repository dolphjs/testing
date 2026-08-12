import type { Sequelize } from 'sequelize';

/**
 * An in-memory `sqlite3`-backed Sequelize instance for tests.
 *
 * Hands back a bare, connected instance only — Sequelize models are bound to
 * an instance at `Model.init({...}, { sequelize, ... })`, so re-attaching
 * already-initialized models the way `autoInitSql` does for a real app isn't
 * meaningful here. Call `Model.init` against the returned instance in your
 * test setup. Requires `sequelize` and `sqlite3` in the consuming app;
 * lazily required so apps that don't use Sequelize never pay to resolve them.
 */
export async function createSqliteTestSequelize(): Promise<Sequelize> {
    let SequelizeCtor: typeof Sequelize;
    try {
        ({ Sequelize: SequelizeCtor } = require('sequelize'));
    } catch {
        throw new Error(
            '`sequelize` is not installed. Run `npm i -D sequelize sqlite3` to use createSqliteTestSequelize().',
        );
    }

    const sequelize = new SequelizeCtor({
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false,
    });

    await sequelize.authenticate();
    return sequelize;
}
