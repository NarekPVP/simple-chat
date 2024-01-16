export const ORM_CONFIG = Object.freeze({
  type: 'sqlite',
  database: 'database/app.db',
  entities: ['dist/**/*.entity.js'],
  autoLoadEntities: true,
  synchronize: true,
});
