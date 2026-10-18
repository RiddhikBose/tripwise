import { upstream } from '../lib/errors.js';

const contact = process.env.WIKI_CONTACT || 'https://github.com/tripwise';
const USER_AGENT = `TripWise/1.0 (student project; ${contact})`;

// Wikipedia rate-limits clients that fire lots of requests at once (the
// ring search used to send 7 in parallel and got 429s). Cap how many are
// in flight per host and retry politely when we do get throttled.
const MAX_IN_FLIGHT = 3;
const queues = new Map();

function limiter(host) {
  if (!queues.has(host)) queues.set(host, { active: 0, waiting: [] });
  const q = queues.get(host);
  return {
    async acquire() {
      if (q.active < MAX_IN_FLIGHT) {
        q.active++;
        return;
      }
      await new Promise((resolve) => q.waiting.push(resolve));
    },
    release() {
      const next = q.waiting.shift();
      if (next) next();
      else q.active--;
    },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function getJson(url, { label = 'external API', timeoutMs = 10000, retries = 2 } = {}) {
  const lock = limiter(new URL(url).host);

  for (let attempt = 0; ; attempt++) {
    await lock.acquire();
    let res;
    try {
      res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const reason = err.name === 'TimeoutError' ? 'timed out' : 'could not be reached';
      throw upstream(`${label} ${reason}. Try again in a moment.`);
    } finally {
      lock.release();
    }

    if ((res.status === 429 || res.status === 503) && attempt < retries) {
      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(Math.min(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 800 * 2 ** attempt, 5000));
      continue;
    }

    if (res.status === 429) throw upstream(`${label} is rate-limiting us right now. Try again in a minute.`);
    if (!res.ok) throw upstream(`${label} responded with ${res.status}.`);
    return res.json();
  }
}
