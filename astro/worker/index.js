// Runs only for "/" (see run_worker_first in wrangler.jsonc). With html_handling "none" the asset server
// does not map "/" to index.html, and every other URL already matches a file name, so this is the whole Worker.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/') url.pathname = '/index.html';
    return env.ASSETS.fetch(new Request(url, request));
  },
};
