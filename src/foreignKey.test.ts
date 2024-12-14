import { Collection, Entity, ManyToOne, MikroORM, OneToMany, PrimaryKey, Property } from '@mikro-orm/sqlite';
import { Migrator } from "@mikro-orm/migrations";
import fs from 'fs-extra';

{
  type MyCustomNumberType = 5 | 10;

  @Entity()
  class TestClass {

    @PrimaryKey()
    id!: number;

    @Property()
    property: MyCustomNumberType;

    @OneToMany(() => ClassWithFk, (fk) => fk.foreignKey)
    fkConstraint = new Collection<ClassWithFk>(this);

    constructor(property: MyCustomNumberType) {
      this.property = property;
    }

  }

  @Entity()
  class ClassWithFk {

    @PrimaryKey()
    id!: number;

    @Property()
    property: string;

    @ManyToOne(() => TestClass)
    foreignKey!: TestClass;

    constructor(property: string) {
      this.property = property;
    }

  }

  beforeAll(async () => {
    // remove all migrations
    await fs.rm('migrations/foreign_key', { recursive: true }).catch(() => { });

    // remove the test db file
    await fs.unlink('dbs/foreign_key.db').catch(() => { });

    // create initial migration
    const orm = await MikroORM.init({
      dbName: ':memory:',
      entities: [TestClass, ClassWithFk],
      debug: ['query', 'query-params'],
      allowGlobalContext: true, // only for testing
      extensions: [Migrator],
      migrations: {
        path: 'migrations/foreign_key',
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
      dbName: 'dbs/foreign_key.db',
      entities: [TestClass, ClassWithFk],
      debug: ['query', 'query-params'],
      allowGlobalContext: true, // only for testing
      migrations: {
        path: 'migrations/foreign_key',
        emit: "js",
        snapshotName: ".snapshot"
      },
    });

    const migrator = orm.getMigrator()

    await migrator.up();

    // create test data
    const testClass = orm.em.create(TestClass, { property: 5 });
    orm.em.create(ClassWithFk, { property: "Hello", foreignKey: testClass });
    await orm.em.flush();

    await orm.close(true);
  });

}

{
  type MyCustomStringType = "5" | "10" | "Hello" | "World";

  @Entity()
  class TestClass {

    @PrimaryKey()
    id!: number;

    @Property()
    property: MyCustomStringType;

    @OneToMany(() => ClassWithFk, (fk) => fk.foreignKey)
    fkConstraint = new Collection<ClassWithFk>(this);

    constructor(property: MyCustomStringType) {
      this.property = property;
    }

  }

  @Entity()
  class ClassWithFk {

    @PrimaryKey()
    id!: number;

    @Property()
    property: string;

    @ManyToOne(() => TestClass)
    foreignKey!: TestClass;

    constructor(property: string) {
      this.property = property;
    }

  }

  test('create migration for changed type', async () => {
    const orm = await MikroORM.init({
      dbName: 'dbs/foreign_key.db',
      entities: [TestClass, ClassWithFk],
      debug: ['query', 'query-params'],
      allowGlobalContext: true, // only for testing
      migrations: {
        path: 'migrations/foreign_key',
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
      dbName: 'dbs/foreign_key.db',
      entities: [TestClass, ClassWithFk],
      debug: ['query', 'query-params'],
      allowGlobalContext: true, // only for testing
      migrations: {
        path: 'migrations/foreign_key',
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
      dbName: 'dbs/foreign_key.db',
      entities: [TestClass, ClassWithFk],
      debug: ['query', 'query-params'],
      allowGlobalContext: true, // only for testing
      migrations: {
        path: 'migrations/foreign_key',
        emit: "js",
        snapshotName: ".snapshot"
      },
    });

    const entity = await orm.em.findOneOrFail(TestClass, { property: "5" });
    expect(entity.property).toBe("5");

    await orm.close(true);
  });

}