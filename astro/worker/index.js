// Production (wrangler.jsonc) runs this only for "/" (run_worker_first: ["/"]): with html_handling "none" the asset
// server does not map "/" to index.html, and every other URL already matches a file name.
// The preview Worker (wrangler.preview.jsonc) runs it for every request and sets PREVIEW, so the copy on
// *.workers.dev is marked noindex and can never compete with the real site in search.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/') url.pathname = '/index.html';
    const res = await env.ASSETS.fetch(new Request(url, request));
    if (!env.PREVIEW) return res;
    const out = new Response(res.body, res);
    out.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return out;
  },
};
