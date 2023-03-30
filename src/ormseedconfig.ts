import ormconfig from "./ormconfig";

const ormseedcconfig = {
    ...ormconfig,
    migrations: ['src/seeds/*.ts'],
    cli: {
        migrationsDir: 'src/seeds'
    }
}