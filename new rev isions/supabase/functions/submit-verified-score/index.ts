import { validateCircuitProof } from './score-validator.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store'
};

class RequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required Edge Function setting: ${name}`);
  return value;
}

function parseJson(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

async function authenticate(req: Request, supabaseUrl: string, anonKey: string) {
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new RequestError(401, 'Sign in to verify circuit completions.');
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: authorization
    }
  });
  if (!response.ok) throw new RequestError(401, 'Your sign-in session is invalid or expired.');

  const user = await response.json();
  const userId: unknown = user.id;
  if (typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId)) {
    throw new RequestError(401, 'The authenticated account could not be identified.');
  }
  return userId;
}

async function serviceRequest(
  supabaseUrl: string,
  serviceRoleKey: string,
  path: string,
  init: RequestInit
) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    }
  });
  const text = await response.text();
  const data = parseJson(text);
  if (!response.ok) {
    const message = typeof data?.message === 'string'
      ? data.message
      : 'The score verification service could not complete the request.';
    return { ok: false as const, status: response.status, data, message };
  }
  return { ok: true as const, data };
}

function databaseErrorResponse(status: number, data: unknown, fallback: string) {
  const code = typeof data === 'object' && data !== null && 'code' in data
    ? String(data.code)
    : '';
  const message = typeof data === 'object' && data !== null && 'message' in data
    ? String(data.message)
    : fallback;

  if (code === '23505') return jsonResponse(409, { ok: false, error: 'This challenge has already been completed.' });
  if (code === 'P0002') return jsonResponse(404, { ok: false, error: 'Verified challenge was not found.' });
  if (status === 400 || code === '22023') return jsonResponse(400, { ok: false, error: message });
  if (code === '23502') return jsonResponse(409, { ok: false, error: message });
  return jsonResponse(502, { ok: false, error: fallback });
}

async function startChallenge(
  userId: string,
  mode: unknown,
  level: unknown,
  supabaseUrl: string,
  serviceRoleKey: string
) {
  const allowedModes = ['story', 'practice', 'rush', 'endless'];
  if (typeof mode !== 'string' || !allowedModes.includes(mode) ||
      typeof level !== 'number' || !Number.isInteger(level) || level < 1 || level > 30) {
    throw new RequestError(400, 'Choose a valid game mode and level from 1 to 30.');
  }

  const result = await serviceRequest(
    supabaseUrl,
    serviceRoleKey,
    '/rest/v1/rpc/issue_verified_run_challenge',
    {
      method: 'POST',
      body: JSON.stringify({
        p_user_id: userId,
        p_mode: mode,
        p_level: level
      })
    }
  );
  if (!result.ok) {
    return databaseErrorResponse(result.status, result.data, result.message);
  }

  const challenge = Array.isArray(result.data) ? result.data[0] : null;
  if (!challenge || typeof challenge.challenge_id !== 'string') {
    return jsonResponse(502, { ok: false, error: 'The verification service returned no challenge.' });
  }
  if (challenge.challenge_completed_at) {
    return jsonResponse(409, {
      ok: false,
      error: 'This mode and level already have a verified completion today.'
    });
  }
  return jsonResponse(200, {
    ok: true,
    challengeId: challenge.challenge_id,
    mode: challenge.challenge_mode,
    level: challenge.challenge_level,
    expiresAt: challenge.challenge_expires_at
  });
}

async function completeChallenge(
  userId: string,
  challengeId: unknown,
  proof: unknown,
  supabaseUrl: string,
  serviceRoleKey: string
) {
  if (typeof challengeId !== 'string' || !/^[0-9a-f-]{36}$/i.test(challengeId)) {
    throw new RequestError(400, 'A valid verified challenge ID is required.');
  }

  const challengeUrl = new URL(`${supabaseUrl}/rest/v1/verified_run_challenges`);
  challengeUrl.searchParams.set(
    'select',
    'id,user_id,mode,level,expires_at,completed_at'
  );
  challengeUrl.searchParams.set('id', `eq.${challengeId}`);
  challengeUrl.searchParams.set('user_id', `eq.${userId}`);
  challengeUrl.searchParams.set('limit', '1');

  const lookup = await serviceRequest(
    supabaseUrl,
    serviceRoleKey,
    `${challengeUrl.pathname}${challengeUrl.search}`,
    { method: 'GET' }
  );
  if (!lookup.ok) {
    return databaseErrorResponse(lookup.status, lookup.data, lookup.message);
  }
  const challenge = Array.isArray(lookup.data) ? lookup.data[0] : null;
  if (!challenge) throw new RequestError(404, 'Verified challenge was not found.');
  if (challenge.completed_at) {
    throw new RequestError(409, 'This verified challenge has already been completed.');
  }
  if (Date.parse(challenge.expires_at) <= Date.now()) {
    throw new RequestError(409, 'This verified challenge has expired. Start a new challenge.');
  }

  const validation = validateCircuitProof(challenge.level, proof);
  if (!validation.valid) {
    throw new RequestError(422, validation.error || 'The wiring proof is invalid.');
  }

  const result = await serviceRequest(
    supabaseUrl,
    serviceRoleKey,
    '/rest/v1/rpc/complete_verified_run_challenge',
    {
      method: 'POST',
      body: JSON.stringify({
        p_user_id: userId,
        p_challenge_id: challengeId
      })
    }
  );
  if (!result.ok) {
    return databaseErrorResponse(result.status, result.data, result.message);
  }
  const completion = Array.isArray(result.data) ? result.data[0] : null;
  if (!completion) {
    return jsonResponse(502, { ok: false, error: 'The verified completion was not recorded.' });
  }
  return jsonResponse(200, {
    ok: true,
    mode: completion.completed_mode,
    level: completion.completed_level,
    overallScore: completion.overall_score,
    modeScore: completion.mode_score,
    bestEndlessStreak: completion.best_endless_streak
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Only POST requests are allowed.' });
  }

  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 16_384) throw new RequestError(413, 'Request is too large.');
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > 16_384) {
      throw new RequestError(413, 'Request is too large.');
    }
    const body = parseJson(rawBody);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new RequestError(400, 'A JSON request body is required.');
    }

    const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/+$/, '');
    const anonKey = requiredEnv('SUPABASE_ANON_KEY');
    const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const userId = await authenticate(req, supabaseUrl, anonKey);

    if (body.action === 'start') {
      return await startChallenge(userId, body.mode, body.level, supabaseUrl, serviceRoleKey);
    }
    if (body.action === 'complete') {
      return await completeChallenge(
        userId,
        body.challengeId,
        body.proof,
        supabaseUrl,
        serviceRoleKey
      );
    }
    throw new RequestError(400, 'Action must be start or complete.');
  } catch (error) {
    if (error instanceof RequestError) {
      return jsonResponse(error.status, { ok: false, error: error.message });
    }
    console.error('Verified score request failed:', error);
    return jsonResponse(500, {
      ok: false,
      error: 'The score verification service failed. Please try again later.'
    });
  }
});
