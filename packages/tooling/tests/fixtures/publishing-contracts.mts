import { startServer } from '@myblog/publishing';

const server = startServer();
server.on('error', (error: Error) => console.error(error.message));
server.close();

// @ts-expect-error The public task accepts no arguments.
startServer({ port: 9000 });
// @ts-expect-error A server handle is not a string.
const invalid: string = server;
void invalid;
