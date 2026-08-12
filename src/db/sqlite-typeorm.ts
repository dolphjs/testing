import type { DataSource } from 'typeorm';

export interface SqliteTestDataSourceOptions {
    /** Entity classes — passed straight to TypeORM, no glob strings or `dolph_config.yaml` involved. */
    entities: Function[];
    /** Defaults to `true`; the whole point of an in-memory DB is a fresh schema per run. */
    synchronize?: boolean;
}

/**
 * An in-memory, `better-sqlite3`-backed TypeORM `DataSource` for tests.
 *
 * Bypasses `autoInitTypeOrm`/`dolph_config.yaml` entirely — those exist to
 * wire a real database at app boot, which is unnecessary ceremony (and a
 * shared on-disk file mutation) for a test that just needs a throwaway
 * schema. Requires `typeorm` and `better-sqlite3` in the consuming app;
 * lazily required so apps that don't use TypeORM never pay to resolve them.
 */
export async function createSqliteTestDataSource(options: SqliteTestDataSourceOptions): Promise<DataSource> {
    let DataSourceCtor: typeof DataSource;
    try {
        ({ DataSource: DataSourceCtor } = require('typeorm'));
    } catch {
        throw new Error(
            '`typeorm` is not installed. Run `npm i -D typeorm better-sqlite3` to use createSqliteTestDataSource().',
        );
    }

    const dataSource = new DataSourceCtor({
        type: 'better-sqlite3',
        database: ':memory:',
        dropSchema: true,
        entities: options.entities,
        synchronize: options.synchronize ?? true,
        logging: false,
    } as any);

    await dataSource.initialize();
    return dataSource;
}
