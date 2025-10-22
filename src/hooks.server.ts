import { error, redirect, type Handle } from '@sveltejs/kit';
import { WorkOS } from '@workos-inc/node';
import type { User } from '$lib/server/models';
import { query } from '$lib/server/db';

import { WORKOS_API_KEY, WORKOS_CLIENT_ID, WORKOS_COOKIE_PASSWORD, HOSTNAME } from '$env/static/private';
import type { RecordId } from 'surrealdb';

const workos = new WorkOS(WORKOS_API_KEY, {
	clientId: WORKOS_CLIENT_ID
});


export const handle: Handle = async ({ event, resolve }) => {

	if (event.url.pathname === '/auth') {
		const code = event.url.searchParams.get('code');
		if (!code) {
			console.error('Auth Failed: No Code Provided')
			throw error(500, 'Authentication Failed');
		}

		try {
			const { user, sealedSession } = await workos.userManagement.authenticateWithCode({
				clientId: WORKOS_CLIENT_ID,
				code,
				session: {
					sealSession: true,
					cookiePassword: WORKOS_COOKIE_PASSWORD
				}
			});

			// check if user exists
			let dbUser = await query<RecordId[]>('SELECT value id FROM users WHERE workos_id = $workos_id', { workos_id: user.id });
			let user_id: RecordId;
			if (!dbUser || dbUser.length === 0) {
				const newUser = await query<User[]>('CREATE users CONTENT $user', {
					user: {
						first_name: user.firstName,
						last_name: user.lastName,
						workos_id: user.id
					}
				});
				user_id = newUser[0].id;
			} else {
				user_id = dbUser[0];
			}

			event.cookies.set('wos-session', sealedSession || '', {
				httpOnly: true,
				secure: true,
				sameSite: 'lax',
				path: '/'
			});

			event.locals.user = user;
			event.locals.user_id = user_id;
		} catch (err) {
			console.error('Auth Failed:', err)
			throw error(500, 'Authentication Failed');
		}

		throw redirect(302, '/profile');
	}

	if (event.url.pathname === '/signout') {
		const wos_session_cookie = event.cookies.get('wos-session') || '';
		const session = workos.userManagement.loadSealedSession({
			sessionData: wos_session_cookie,
			cookiePassword: WORKOS_COOKIE_PASSWORD
		});

		const signoutUrl = await session.getLogoutUrl();
		event.cookies.delete('wos-session', { path: '/' });
		throw redirect(302, signoutUrl);
	}

	if (event.url.pathname.startsWith('/profile')) {

		const wos_session_cookie = event.cookies.get('wos-session') || '';

		const signinUrl = workos.userManagement.getAuthorizationUrl({
			clientId: WORKOS_CLIENT_ID,
			redirectUri: HOSTNAME + '/auth',
			provider: 'authkit',
		})

		if (!wos_session_cookie) {
			throw redirect(302, signinUrl);
		}

		const session = workos.userManagement.loadSealedSession({
			sessionData: wos_session_cookie,
			cookiePassword: WORKOS_COOKIE_PASSWORD
		});

		const { authenticated, user } = await session.authenticate();

		if (!authenticated) {
			try {
				const { authenticated, sealedSession } = await session.refresh();

				if (!authenticated) {
					throw redirect(302, signinUrl);
				}

				let dbUser = await query<RecordId[]>('SELECT value id FROM users WHERE workos_id = $workos_id', { workos_id: user.id });
				let user_id: RecordId;
				if (!dbUser || dbUser.length === 0) {
					const newUser = await query<User[]>('CREATE users CONTENT $user', {
						user: {
							first_name: user.firstName,
							last_name: user.lastName,
							workos_id: user.id
						}
					});
					user_id = newUser[0].id;
				} else {
					user_id = dbUser[0];
				}

				event.cookies.set('wos-session', sealedSession || '', {
					httpOnly: true,
					secure: true,
					sameSite: 'lax',
					path: '/',
				});

				event.locals.user = session.user;
				event.locals.user_id = user_id;

				const response = await resolve(event);
				return response;
			} catch (err) {
				event.cookies.delete('wos-session', { path: '/' });
				throw redirect(302, signinUrl);
			}
		}

		if (!user) {
			throw redirect(302, signinUrl);
		}

		let dbUser = await query<RecordId[]>('SELECT value id FROM users WHERE workos_id = $workos_id', { workos_id: user.id });
		let user_id: RecordId;
		if (!dbUser || dbUser.length === 0) {
			const newUser = await query<User[]>('CREATE users CONTENT $user', {
				user: {
					first_name: user.firstName,
					last_name: user.lastName,
					workos_id: user.id
				}
			});
			user_id = newUser[0].id;
		} else {
			user_id = dbUser[0];
		}

		event.locals.user = user;
		event.locals.user_id = user_id;

		const response = await resolve(event);
		return response;
	}

	const response = await resolve(event);
	return response;
}
