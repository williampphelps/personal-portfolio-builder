// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { User } from '@workos-inc/node';
import type { RecordId } from 'surrealdb';
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: User;
			user_id: RecordId;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export { };
