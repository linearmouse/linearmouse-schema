export async function handleRequest(event: FetchEvent): Promise<Response> {
  const { pathname } = new URL(event.request.url);

  const match = /^\/schema\/(sha-)?([^/]+)$/.exec(pathname);

  if (!match) {
    return new Response('Not found', { status: 404 });
  }

  const cache = caches.default;
  {
    const response = await cache.match(event.request);
    if (response) {
      return response;
    }
  }

  let [, isCommit, head] = match;

  const isVersion = !isCommit && /^\d+(?:\.\d+){2}(?:-|$)/.test(head);

  if (isVersion) {
    head = `v${head}`;
  }

  const { ok, body } = await fetch(
    `https://raw.githubusercontent.com/linearmouse/linearmouse/${head}/Documentation/Configuration.json`
  );

  if (!ok) {
    return new Response('Not found', { status: 404 });
  }

  const cacheControl =
    isCommit || isVersion ? 'public, max-age=86400, s-maxage=31536000' : 'public, max-age=0, s-maxage=600';

  const response = new Response(body, {
    headers: {
      'content-type': 'application/json',
      'cache-control': cacheControl,
    },
  });

  event.waitUntil(cache.put(event.request, response.clone()));

  return response;
}
