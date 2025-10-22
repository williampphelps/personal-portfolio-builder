import type { RecordId } from 'surrealdb';
export interface User {
	id: RecordId;
	first_name: string;
	last_name: string;
	workos_id: string;
}
