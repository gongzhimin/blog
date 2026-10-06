import type { Server } from 'node:http';
/** Requires BLOG_WEBHOOK_TOKEN. Caller owns close() and listener error handling. */
export function startServer(): Server;
