/**
 * Cloudflare Worker entry point
 */

import { Env } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/submit' && request.method === 'POST') {
      return handleSubmit(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function handleSubmit(request: Request, env: Env): Promise<Response> {
  try {
    const data = await request.json();
    
    // TODO: Validate and process submission
    // TODO: Store in D1 database
    // TODO: Sync with Notion if configured
    
    return Response.json({ id: 'temp-id' });
  } catch (error) {
    return new Response('Invalid request', { status: 400 });
  }
}
