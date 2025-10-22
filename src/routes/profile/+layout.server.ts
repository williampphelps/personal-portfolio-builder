import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user;
	const user_id = locals.user_id.toString();
	return {
		user,
		user_id
	};
}
