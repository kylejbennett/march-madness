import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'node:crypto';

const s3 = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key,X-Admin-Password',
  'Access-Control-Allow-Methods': 'PUT,OPTIONS',
  'Content-Type': 'application/json',
};

function isAuthorized(headers) {
  if (!ADMIN_PASSWORD || !headers) return false;
  const provided =
    Object.entries(headers).find(([k]) => k.toLowerCase() === 'x-admin-password')?.[1] || '';
  const expectedBuf = Buffer.from(ADMIN_PASSWORD, 'utf8');
  const providedBuf = Buffer.from(String(provided), 'utf8');
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

async function readJsonIfExists(key) {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    const text = await res.Body.transformToString();
    return JSON.parse(text);
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

export const handler = async (event) => {
  try {
    if (!isAuthorized(event.headers)) {
      return response(401, { error: 'Unauthorized: invalid admin password.' });
    }

    const year = event.pathParameters?.year;
    if (!year || !/^\d{4}$/.test(year)) {
      return response(400, { error: 'Invalid or missing 4-digit year path parameter.' });
    }

    if (!event.body) {
      return response(400, { error: 'Request body is required.' });
    }

    let payload;
    try {
      payload = JSON.parse(event.body);
    } catch {
      return response(400, { error: 'Request body must be valid JSON.' });
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return response(400, { error: 'Season payload must be a JSON object.' });
    }

    const numericYear = Number(year);
    const seasonData = {
      ...payload,
      year: numericYear,
      updatedAt: new Date().toISOString(),
    };

    const seasonKey = `seasons/${year}.json`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: seasonKey,
        Body: JSON.stringify(seasonData, null, 2),
        ContentType: 'application/json',
        CacheControl: 'no-cache, no-store, must-revalidate',
      })
    );

    // Keep seasons/index.json up to date so the frontend discovers all available seasons
    const existingIndex = (await readJsonIfExists('seasons/index.json')) || { seasons: [] };
    const list = Array.isArray(existingIndex.seasons) ? existingIndex.seasons : [];

    const summary = {
      year: numericYear,
      label: seasonData.label || year,
      status:
        seasonData.status ||
        (Array.isArray(seasonData.teams) && seasonData.teams.length > 0 ? 'active' : 'upcoming'),
      hasTeams: Array.isArray(seasonData.teams) && seasonData.teams.length > 0,
    };

    const idx = list.findIndex((s) => Number(s.year) === numericYear);
    if (idx >= 0) {
      list[idx] = summary;
    } else {
      list.push(summary);
    }
    list.sort((a, b) => Number(b.year) - Number(a.year));

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: 'seasons/index.json',
        Body: JSON.stringify({ seasons: list, updatedAt: new Date().toISOString() }, null, 2),
        ContentType: 'application/json',
        CacheControl: 'no-cache, no-store, must-revalidate',
      })
    );

    return response(200, {
      ok: true,
      key: seasonKey,
      year: numericYear,
    });
  } catch (err) {
    console.error('Failed to write season data to S3:', err);
    return response(500, { error: 'Internal server error writing season data.' });
  }
};
