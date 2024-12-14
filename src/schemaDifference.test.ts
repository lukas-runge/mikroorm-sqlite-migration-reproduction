import { Entity, MikroORM, PrimaryKey, Property  } from '@mikro-orm/sqlite';
import { Migrator } from "@mikro-orm/migrations";
import fs from 'fs-extra';

{
  type MyCustomNumberType = 5 | 10;

  @Entity()
  class TestClass {

    @PrimaryKey()
    id!: number;

    @Property({ type: 'number' })
    property: MyCustomNumberType;

    constructor(property: MyCustomNumberType) {
      this.property = property;
    }

  }

  beforeAll(async () => {
    // remove all migrations
    await fs.rm('migrations/schema_difference', { recursive: true }).catch(() => { });
  
    // remove the test db file
    await fs.unlink('dbs/schema_difference.db').catch(() => { });
  
    // create initial migration
    const orm = await MikroORM.init({
      dbName: ':memory:',
      entities: [TestClass],
      debug: ['query', 'query-params'],
      allowGlobalContext: true, // only for testing
      extensions: [Migrator],
      migrations: {
        path: 'migrations/schema_difference',
        emit: "js",
        snapshotName: ".snapshot"
      },
    });
  
    const migrator = orm.getMigrator()
    await migrator.createInitialMigration();
  
    await orm.close(true);
  });
  
  test('create test data', async () => {
    const orm = await MikroORM.init({
      dbName: 'dbs/schema_difference.db',
      entities: [TestClass],
      debug: ['query', 'query-params'],
      allowGlobalContext: true, // only for testing
      migrations: {
        path: 'migrations/schema_difference',
        emit: "js",
        snapshotName: ".snapshot"
      },
    });
  
    const migrator = orm.getMigrator()
  
    await migrator.up();
  
    // create test data
    orm.em.create(TestClass, { property: 5 });
    await orm.em.flush();
  });
}

{
  type MyCustomStringType = "5" | "10" | "Hello" | "World";

  @Entity()
  class TestClass {

    @PrimaryKey()
    id!: number;

    @Property({ type: 'string' })
    property: MyCustomStringType;

    constructor(property: MyCustomStringType) {
      this.property = property;
    }

  }

  test('create migration for changed type', async () => {
    const orm = await MikroORM.init({
      dbName: 'dbs/schema_difference.db',
      entities: [TestClass],
      debug: ['query', 'query-params'],
      allowGlobalContext: true, // only for testing
      migrations: {
        path: 'migrations/schema_difference',
        emit: "js",
        snapshotName: ".snapshot"
      },
    });
  
    const migrator = orm.getMigrator()
    const migrationNeeded = await migrator.checkMigrationNeeded();
    const migrationResult = await migrator.createMigration(undefined, undefined, false, "new_data_structure");
  
    expect(migrationNeeded).toBe(true);
    expect(migrationResult.diff.up.length).toBeGreaterThan(0);
  
    await orm.close(true);
  });
  
  test('apply new migration to test db', async () => {
    const orm = await MikroORM.init({
      dbName: 'dbs/schema_difference.db',
      entities: [TestClass],
      debug: ['query', 'query-params'],
      allowGlobalContext: true, // only for testing
      migrations: {
        path: 'migrations/schema_difference',
        emit: "js",
        snapshotName: ".snapshot"
      },
    });
  
    const migrator = orm.getMigrator()
  
    const pendingMigrations = await migrator.getPendingMigrations()
  
    await migrator.up();
  
    expect(pendingMigrations).toHaveLength(1);
  
    await orm.close(true);
  });

  test('retrieve old data from new data structure', async () => {
    const orm = await MikroORM.init({
      dbName: 'dbs/schema_difference.db',
      entities: [TestClass],
      debug: ['query', 'query-params'],
      allowGlobalContext: true, // only for testing
      migrations: {
        path: 'migrations/schema_difference',
        emit: "js",
        snapshotName: ".snapshot"
      },
    });

    const entity = await orm.em.findOneOrFail(TestClass, { property: "5" });
    expect(entity.property).toBe("5");

    await orm.close(true);
  });
}

