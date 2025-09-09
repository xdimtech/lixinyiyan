import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { invalidateSession, deleteSessionTokenCookie } from '$lib/server/auth';

export const actions: Actions = {
	logout: async (event) => {
		if (event.locals.session) {
			await invalidateSession(event.locals.session.id);
			deleteSessionTokenCookie(event);
		}
		return redirect(302, '/login');
	}
};
