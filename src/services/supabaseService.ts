import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL2 ?? '', { prepare: false });

export { sql };
