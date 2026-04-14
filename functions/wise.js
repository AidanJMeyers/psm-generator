// Single source of truth for all Wise API calls.
//
// Session 11 scope (read-only first deploy): userByIdentifier only.
// ensureAdminChat + sendMessage will be added after Kiran provides the
// "Send a Message" Postman shape — intentionally NOT stubbed here so an
// incomplete implementation can't accidentally be called.

const NAMESPACE_UA_PREFIX = "VendorIntegrations";

function basicAuthHeader(userId, apiKey) {
  const token = Buffer.from(`${userId}:${apiKey}`).toString("base64");
  return `Basic ${token}`;
}

function wiseHeaders(cfg) {
  return {
    "Authorization":   basicAuthHeader(cfg.userId, cfg.apiKey),
    "x-api-key":       cfg.apiKey,
    "x-wise-namespace": cfg.namespace,
    "user-agent":      `${NAMESPACE_UA_PREFIX}/${cfg.namespace}`,
    "Content-Type":    "application/json",
  };
}

// GET /vendors/userByIdentifier?provider=EMAIL&identifier=<urlencoded>
//
// Returns:
//   { found: true,  user: { _id, email, name, ... } }
//   { found: false }                                     // 404 — user not in Wise
//
// Throws on any other non-2xx status so callers see real errors.
async function userByIdentifierEmail(cfg, email) {
  const url = `${cfg.host}/vendors/userByIdentifier`
    + `?provider=EMAIL&identifier=${encodeURIComponent(email)}`;
  const res = await fetch(url, { method: "GET", headers: wiseHeaders(cfg) });

  if (res.status === 404) {
    return { found: false };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Wise userByIdentifier ${res.status}: ${text.slice(0, 300)}`);
  }
  const body = await res.json();
  const user = body && body.data && body.data.user;
  if (!user) {
    return { found: false };
  }
  return { found: true, user };
}

module.exports = { userByIdentifierEmail };
