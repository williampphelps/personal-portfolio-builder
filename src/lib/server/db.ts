import {
	SURREAL_URL,
	SURREAL_USERNAME,
	SURREAL_PASSWORD,
	SURREAL_NAMESPACE,
	SURREAL_DATABASE
} from '$env/static/private';
import Surreal from 'surrealdb';

interface DBConfig {
	url: string;
	user: string;
	pass: string;
	namespace: string;
	database: string;
}

const DEFAULT_CONFIG: DBConfig = {
	url: SURREAL_URL,
	user: SURREAL_USERNAME,
	pass: SURREAL_PASSWORD,
	namespace: SURREAL_NAMESPACE,
	database: SURREAL_DATABASE
};

let db: Surreal | null = null;

export async function getDb(config: DBConfig = DEFAULT_CONFIG): Promise<Surreal> {
	if (db) return db;

	db = new Surreal();
	await connectDb(db, config);
	return db;
}

async function connectDb(db: Surreal, config: DBConfig) {
	await db.connect(config.url, {
		namespace: config.namespace,
		database: config.database,
		auth: {
			username: config.user,
			password: config.pass
		}
	});
}

export async function queryMany<T extends unknown[]>(
	query: string,
	vars?: Record<string, unknown>
): Promise<T> {
	const connection = await getDb();
	try {
		return await connection.query<T>(query, vars);
	} catch (err: any) {
		if (err.message?.includes('Expired') || err.message?.includes('Authentication')) {
			console.warn('Token expired. Reconnecting...');
			await connection.close();
			db = null;
			const newDb = await getDb();
			return await newDb.query<T>(query, vars);
		}
		throw err;
	}
}


export async function query<T>(
	query: string,
	vars?: Record<string, unknown>
): Promise<T> {
	const [result] = await queryMany<[T]>(query, vars);
	return result;
}
