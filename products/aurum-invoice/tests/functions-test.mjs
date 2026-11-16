// Local test of the payment functions (functions/billing and functions/billing-webhook). Run:  node tests/functions-test.mjs
// Nothing live is touched: the platform (Deno), the database and Paystack are all stood in for with scripted answers.
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const env = { SUPABASE_URL: "https://db.test", SUPABASE_SERVICE_ROLE_KEY: "service-key", SITE_URL: "https://auruminvoice.com.ng", PAYSTACK_TEST_SECRET_KEY: "sk_test_AAA", PAYSTACK_LIVE_SECRET_KEY: "sk_live_BBB" };
const handlers = {};
let current = null;
globalThis.Deno = { env: { get: (k) => env[k] }, serve: (h) => { handlers[current] = h; } };

// scripted world
let rpcMap = {}, psMap = {}, calls = [];
globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  const body = opts.body ? JSON.parse(opts.body) : undefined;
  if (url.startsWith(env.SUPABASE_URL + "/rest/v1/rpc/")) {
    const fn = url.split("/rpc/")[1];
    calls.push({ kind: "rpc", fn, args: body });
    const v = rpcMap[fn]; const out = typeof v === "function" ? v(body) : v;
    if (out === undefined) return new Response(null, { status: 204 });   // what a function that returns nothing answers
    if (out && out.__error) return new Response(out.__error, { status: 500 });
    return new Response(JSON.stringify(out), { status: 200 });
  }
  if (url.startsWith("https://api.paystack.co")) {
    const p = url.replace("https://api.paystack.co", "");
    const method = opts.method || "GET";
    calls.push({ kind: "ps", method, path: p, body, auth: (opts.headers || {}).Authorization });
    const key = Object.keys(psMap).find((k) => { const [m, pp] = k.split(" "); return m === method && (pp === p || (pp.endsWith("*") && p.startsWith(pp.slice(0, -1)))); });
    const v = key ? psMap[key] : { status: false, message: "no script for " + method + " " + p };
    return new Response(JSON.stringify(typeof v === "function" ? v(body) : v), { status: 200 });
  }
  throw new Error("unexpected fetch " + url);
};

for (const name of ["billing-webhook", "billing"]) {
  current = name;
  await import(pathToFileURL(path.join(here, "..", "functions", name, "index.ts")).href);
}

let pass = 0, fail = 0;
const check = (name, ok, got) => { if (ok) pass++; else { fail++; console.log("FAIL:", name, "|", typeof got === "string" ? got : JSON.stringify(got)); } };
const reset = () => { rpcMap = { log_billing: undefined }; psMap = {}; calls = []; };
const rpcCalls = (fn) => calls.filter((c) => c.kind === "rpc" && c.fn === fn);
const psCalls = () => calls.filter((c) => c.kind === "ps");
const sign = (secret, raw) => crypto.createHmac("sha512", secret).update(raw).digest("hex");
const REF = "AUS-ABCDEFGHIJ0123456789";
const hook = async (event, secret = env.PAYSTACK_TEST_SECRET_KEY, sigOverride) => {
  const raw = JSON.stringify(event);
  const headers = { "content-type": "application/json" };
  const sig = sigOverride === undefined ? sign(secret, raw) : sigOverride;
  if (sig) headers["x-paystack-signature"] = sig;
  const res = await handlers["billing-webhook"](new Request("https://fn.test/", { method: "POST", headers, body: raw }));
  return { status: res.status, body: await res.json() };
};
const order = (o = {}) => ({ ok: true, reference: REF, user_id: "user-1", licence_key: "AUR-KEY", tier: "pro", period: "month", method: "card", amount_kobo: 600000, mode: "test", status: "pending", email: "a@x.com", plan_code: "PLN_PROM", old_sub: null, ...o });
const verifyOk = (o = {}) => ({ status: true, data: { status: "success", reference: REF, currency: "NGN", amount: 600000, channel: "card", customer: { customer_code: "CUS_1", email: "a@x.com" }, plan: { plan_code: "PLN_PROM" }, ...o } });

// ---------------- webhook ----------------
reset();
let r = await handlers["billing-webhook"](new Request("https://fn.test/", { method: "GET" }));
check("W01 only POST is accepted", r.status === 405, r.status);
r = await hook({ event: "charge.success", data: {} }, env.PAYSTACK_TEST_SECRET_KEY, "");
check("W02 no signature is refused", r.status === 401, r);
reset(); r = await hook({ event: "charge.success", data: { reference: REF } }, env.PAYSTACK_TEST_SECRET_KEY, "deadbeef");
check("W03 a wrong signature is refused and nothing is counted", r.status === 401 && rpcCalls("apply_payment").length === 0 && psCalls().length === 0, r);
check("W04 a bad signature is written to the log", rpcCalls("log_billing").some((c) => c.args.p_kind === "webhook_bad_signature"), calls);

// a card order paid in test mode
reset();
rpcMap.sub_order_for_verify = order(); psMap["GET /transaction/verify/*"] = verifyOk(); rpcMap.apply_payment = { ok: true, tier: "pro", period: "month", paid_until: "2026-12-16T00:00:00Z" };
r = await hook({ event: "charge.success", data: { reference: REF, domain: "test" } });
const ap = rpcCalls("apply_payment")[0];
check("W05 a real payment is counted once, with Paystack's amount", r.status === 200 && ap && ap.args.p_reference === REF && ap.args.p_paid_kobo === 600000 && ap.args.p_source === "order", { r, ap });
check("W06 Paystack was asked with the TEST key", psCalls()[0].auth === "Bearer sk_test_AAA", psCalls()[0]);
check("W07 the card customer is remembered for later automatic charges", rpcCalls("save_subscription").some((c) => c.args.p_customer_code === "CUS_1" && c.args.p_licence_key === "AUR-KEY" && c.args.p_tier === "pro" && c.args.p_period === "month"), rpcCalls("save_subscription"));

// the message says one thing, Paystack says another
reset();
rpcMap.sub_order_for_verify = order(); psMap["GET /transaction/verify/*"] = verifyOk({ status: "abandoned" });
r = await hook({ event: "charge.success", data: { reference: REF, amount: 600000 } });
check("W08 a message that Paystack does not confirm counts for nothing", r.status === 200 && rpcCalls("apply_payment").length === 0, calls);
reset(); rpcMap.sub_order_for_verify = order(); psMap["GET /transaction/verify/*"] = verifyOk({ currency: "USD" });
await hook({ event: "charge.success", data: { reference: REF } });
check("W09 a payment in another currency counts for nothing", rpcCalls("apply_payment").length === 0, calls);
reset(); rpcMap.sub_order_for_verify = order(); psMap["GET /transaction/verify/*"] = verifyOk({ reference: "AUS-SOMETHINGELSE0000000" });
await hook({ event: "charge.success", data: { reference: REF } });
check("W10 a reference that does not match counts for nothing", rpcCalls("apply_payment").length === 0, calls);
reset(); rpcMap.sub_order_for_verify = order({ amount_kobo: 600000 }); psMap["GET /transaction/verify/*"] = verifyOk({ amount: 100 }); rpcMap.apply_payment = (a) => ({ ok: false, reason: "underpaid" });
await hook({ event: "charge.success", data: { reference: REF } });
check("W11 a small amount is passed on exactly as Paystack reports it (the database refuses it)", rpcCalls("apply_payment")[0]?.args.p_paid_kobo === 100, rpcCalls("apply_payment"));

// repeats and unknowns
reset(); rpcMap.sub_order_for_verify = order({ status: "paid" });
r = await hook({ event: "charge.success", data: { reference: REF } });
check("W12 an order already paid is not asked about again", r.status === 200 && rpcCalls("apply_payment").length === 0 && psCalls().length === 0, calls);
reset(); rpcMap.sub_order_for_verify = { ok: false, reason: "unknown" };
r = await hook({ event: "charge.success", data: { reference: REF } });
check("W13 an unknown order is ignored with a 200", r.status === 200 && rpcCalls("apply_payment").length === 0, r);
reset(); rpcMap.sub_order_for_verify = order({ mode: "live" });
r = await hook({ event: "charge.success", data: { reference: REF } }, env.PAYSTACK_TEST_SECRET_KEY);
check("W14 a TEST message about a LIVE order is ignored", rpcCalls("apply_payment").length === 0 && psCalls().length === 0 && rpcCalls("log_billing").some((c) => c.args.p_kind === "mode_mismatch"), calls);
reset(); rpcMap.sub_order_for_verify = order({ mode: "live" }); psMap["GET /transaction/verify/*"] = verifyOk(); rpcMap.apply_payment = { ok: true, tier: "pro", period: "month", paid_until: "x" };
r = await hook({ event: "charge.success", data: { reference: REF } }, env.PAYSTACK_LIVE_SECRET_KEY);
check("W15 a LIVE message uses the LIVE key", psCalls()[0]?.auth === "Bearer sk_live_BBB" && rpcCalls("apply_payment").length === 1, psCalls());
reset(); rpcMap.sub_order_for_verify = () => { throw new Error("boom"); };
r = await hook({ event: "charge.success", data: { reference: REF } });
check("W16 an error inside is logged and still answered 200", r.status === 200 && rpcCalls("log_billing").some((c) => c.args.p_kind === "webhook_error"), r);

// automatic card renewals
reset();
rpcMap.price_codes = [{ tier: "pro", period: "month", amount_kobo: 600000, code: "PLN_PROM" }, { tier: "pro", period: "year", amount_kobo: 6000000, code: "PLN_PROY" }];
rpcMap.licence_for_customer = { licence_key: "AUR-KEY", tier: "pro", period: "month" };
psMap["GET /transaction/verify/*"] = { status: true, data: { status: "success", reference: "T123456", currency: "NGN", amount: 600000, channel: "card" } };
rpcMap.apply_payment = { ok: true };
r = await hook({ event: "charge.success", data: { reference: "T123456", domain: "test", customer: { customer_code: "CUS_1", email: "a@x.com" }, plan: { plan_code: "PLN_PROM" } } });
const rn = rpcCalls("apply_payment")[0];
check("W17 a later automatic charge is added as a renewal for the right account, plan and period", rn && rn.args.p_source === "renewal" && rn.args.p_licence_key === "AUR-KEY" && rn.args.p_tier === "pro" && rn.args.p_period === "month" && rn.args.p_mode === "test" && rn.args.p_paid_kobo === 600000, rn);
reset(); rpcMap.price_codes = [{ tier: "pro", period: "month", amount_kobo: 600000, code: "PLN_PROM" }];
await hook({ event: "charge.success", data: { reference: "T999", customer: { customer_code: "CUS_X" }, plan: { plan_code: "PLN_OTHER" } } });
check("W18 a charge for a plan that is not ours is ignored", rpcCalls("apply_payment").length === 0 && psCalls().length === 0, calls);
reset(); rpcMap.price_codes = [{ tier: "pro", period: "month", amount_kobo: 600000, code: "PLN_PROM" }]; rpcMap.licence_for_customer = null; rpcMap.licence_for_email = null;
await hook({ event: "charge.success", data: { reference: "T999", customer: { customer_code: "CUS_X", email: "nobody@x.com" }, plan: { plan_code: "PLN_PROM" } } });
check("W19 a charge for a customer we do not know is ignored", rpcCalls("apply_payment").length === 0, calls);
reset(); rpcMap.price_codes = [{ tier: "pro", period: "month", amount_kobo: 600000, code: "PLN_PROM" }]; rpcMap.licence_for_customer = null; rpcMap.licence_for_email = "AUR-KEY";
psMap["GET /transaction/verify/*"] = { status: true, data: { status: "success", reference: "T555", currency: "NGN", amount: 600000, channel: "card" } }; rpcMap.apply_payment = { ok: true };
await hook({ event: "charge.success", data: { reference: "T555", customer: { customer_code: "CUS_NEW", email: "a@x.com" }, plan: { plan_code: "PLN_PROM" } } });
check("W20 if the customer code is new, the account is found by email", rpcCalls("apply_payment")[0]?.args.p_licence_key === "AUR-KEY", calls);
reset(); rpcMap.price_codes = [{ tier: "pro", period: "month", amount_kobo: 600000, code: "PLN_PROM" }]; rpcMap.licence_for_customer = { licence_key: "AUR-KEY" };
psMap["GET /transaction/verify/*"] = { status: true, data: { status: "failed", reference: "T777", currency: "NGN", amount: 600000 } };
await hook({ event: "charge.success", data: { reference: "T777", customer: { customer_code: "CUS_1" }, plan: { plan_code: "PLN_PROM" } } });
check("W21 a renewal that Paystack does not confirm is ignored", rpcCalls("apply_payment").length === 0, calls);

// subscription messages
reset(); rpcMap.price_codes = [{ tier: "pro", period: "month", amount_kobo: 600000, code: "PLN_PROM" }]; rpcMap.licence_for_customer = { licence_key: "AUR-KEY" };
rpcMap.subscription_of = { code: "SUB_OLD", token: "tok_old", status: "active" }; psMap["POST /subscription/disable"] = { status: true, message: "ok" };
await hook({ event: "subscription.create", data: { subscription_code: "SUB_NEW", email_token: "tok_new", customer: { customer_code: "CUS_1", email: "a@x.com" }, plan: { plan_code: "PLN_PROM" }, next_payment_date: "2026-12-16T00:00:00.000Z" } });
const sv = rpcCalls("save_subscription")[0], dis = psCalls().find((c) => c.path === "/subscription/disable");
check("W22 a new subscription is saved with its code, token, plan and next date", sv && sv.args.p_subscription_code === "SUB_NEW" && sv.args.p_email_token === "tok_new" && sv.args.p_tier === "pro" && sv.args.p_period === "month" && sv.args.p_next === "2026-12-16T00:00:00.000Z", sv);
check("W23 the OLD card subscription is switched off so nobody is charged twice", dis && dis.body.code === "SUB_OLD" && dis.body.token === "tok_old", dis);
reset(); rpcMap.price_codes = [{ tier: "pro", period: "month", amount_kobo: 600000, code: "PLN_PROM" }]; rpcMap.licence_for_customer = { licence_key: "AUR-KEY" }; rpcMap.subscription_of = { code: "SUB_SAME", token: "t", status: "active" };
await hook({ event: "subscription.create", data: { subscription_code: "SUB_SAME", email_token: "t", customer: { customer_code: "CUS_1" }, plan: { plan_code: "PLN_PROM" } } });
check("W24 the same subscription arriving twice does not switch itself off", !psCalls().some((c) => c.path === "/subscription/disable"), calls);
reset(); rpcMap.mark_subscription = { ok: true };
await hook({ event: "invoice.payment_failed", data: { subscription: { subscription_code: "SUB_1" }, customer: { email: "a@x.com" } } });
check("W25 a failed renewal marks the subscription 'attention'", rpcCalls("mark_subscription")[0]?.args.p_status === "attention" && rpcCalls("mark_subscription")[0]?.args.p_subscription_code === "SUB_1", calls);
reset(); rpcMap.mark_subscription = { ok: true };
await hook({ event: "subscription.not_renew", data: { subscription_code: "SUB_1" } }); await hook({ event: "subscription.disable", data: { subscription_code: "SUB_2" } });
check("W26 'not renewing' and 'disabled' are recorded", rpcCalls("mark_subscription").map((c) => c.args.p_status).join() === "not_renewing,off", rpcCalls("mark_subscription"));
reset(); rpcMap.apply_refund = { ok: true };
await hook({ event: "refund.processed", data: { transaction_reference: REF, status: "processed" } });
check("W27 a confirmed refund is passed to the database", rpcCalls("apply_refund")[0]?.args.p_reference === REF, calls);
reset(); r = await hook({ event: "customeridentification.success", data: {} });
check("W28 an event we do not use is acknowledged and ignored", r.status === 200 && !calls.some((c) => c.kind === "rpc" && c.fn !== "log_billing"), calls);

// ---------------- billing (signed-in) ----------------
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (sub, exp = Math.floor(Date.now() / 1000) + 3600) => b64({ alg: "HS256" }) + "." + b64({ sub, email: sub + "@x.com", exp }) + ".sig";
const bill = async (action, extra = {}, token = jwt("user-1")) => {
  const headers = { "content-type": "application/json" }; if (token) headers.authorization = "Bearer " + token;
  const res = await handlers["billing"](new Request("https://fn.test/", { method: "POST", headers, body: JSON.stringify({ action, ...extra }) }));
  return { status: res.status, body: await res.json() };
};
reset(); r = await bill("init", { reference: REF }, null);
check("B01 not signed in is refused", r.status === 401, r);
reset(); r = await bill("init", { reference: REF }, jwt("user-1", 1000));
check("B02 an expired sign-in is refused", r.status === 401, r);
reset(); r = await bill("nonsense");
check("B03 an unknown action is refused", r.status === 400, r);
reset(); rpcMap.sub_order_for_verify = order({ user_id: "someone-else" });
r = await bill("init", { reference: REF });
check("B04 starting someone else's order is refused", r.body.reason === "unknown" && psCalls().length === 0, r);
reset(); rpcMap.sub_order_for_verify = order(); psMap["POST /transaction/initialize"] = { status: true, data: { authorization_url: "https://checkout.paystack.com/abc" } };
r = await bill("init", { reference: REF });
const ini = psCalls()[0];
check("B05 a card order is started with the plan and card only, and the return address", r.body.ok && r.body.authorization_url === "https://checkout.paystack.com/abc" && ini.body.plan === "PLN_PROM" && ini.body.channels.join() === "card" && ini.body.reference === REF && ini.body.callback_url === `https://auruminvoice.com.ng/app/?paid=${REF}` && ini.body.currency === "NGN" && ini.body.email === "a@x.com", ini);
check("B06 the TEST key is used for a test order", ini.auth === "Bearer sk_test_AAA", ini);
reset(); rpcMap.sub_order_for_verify = order({ method: "transfer", plan_code: null }); psMap["POST /transaction/initialize"] = { status: true, data: { authorization_url: "https://checkout.paystack.com/xyz" } };
r = await bill("init", { reference: REF }); const it = psCalls()[0];
check("B07 a transfer order has no plan and offers transfer, USSD and bank", r.body.ok && !it.body.plan && it.body.channels.join() === "bank_transfer,ussd,bank" && it.body.amount === 600000, it);
reset(); rpcMap.sub_order_for_verify = order({ plan_code: null });
r = await bill("init", { reference: REF });
check("B08 a card order with no Paystack plan set up yet says so (and calls nothing)", r.body.reason === "plan_not_ready" && psCalls().length === 0, r);
reset(); rpcMap.sub_order_for_verify = order({ status: "paid" });
r = await bill("init", { reference: REF });
check("B09 an order already paid is not started again", r.body.reason === "already_paid", r);
reset(); rpcMap.sub_order_for_verify = order(); delete env.PAYSTACK_TEST_SECRET_KEY;
r = await bill("init", { reference: REF }); env.PAYSTACK_TEST_SECRET_KEY = "sk_test_AAA";
check("B10 with no Paystack key set, it says not configured", r.body.reason === "not_configured", r);
reset(); rpcMap.sub_order_for_verify = order(); psMap["GET /transaction/verify/*"] = verifyOk({ status: "abandoned" });
r = await bill("verify", { reference: REF });
check("B11 coming back before paying says pending", r.body.ok === false && r.body.reason === "pending" && rpcCalls("apply_payment").length === 0, r);
reset(); rpcMap.sub_order_for_verify = order(); psMap["GET /transaction/verify/*"] = verifyOk(); rpcMap.apply_payment = { ok: true, tier: "pro", period: "month", paid_until: "2026-12-16T00:00:00Z", bonus_days: 0 };
r = await bill("verify", { reference: REF });
check("B12 coming back after paying counts it and answers with the new date", r.body.ok && r.body.status === "paid" && r.body.paid_until === "2026-12-16T00:00:00Z" && rpcCalls("apply_payment").length === 1, r);
reset(); rpcMap.sub_order_for_verify = order({ user_id: "someone-else" });
r = await bill("verify", { reference: REF });
check("B13 checking someone else's order is refused", r.body.reason === "unknown", r);
reset(); rpcMap.licence_of_user = "AUR-KEY"; rpcMap.subscription_of = { code: "SUB_1", token: "tok" }; rpcMap.plan_prices = { mode: "test" }; psMap["POST /subscription/disable"] = { status: true }; rpcMap.mark_subscription = { ok: true };
r = await bill("stop_renewal"); const sr = psCalls()[0];
check("B14 stopping renewal switches the card subscription off and records it", r.body.ok && sr.path === "/subscription/disable" && sr.body.code === "SUB_1" && sr.body.token === "tok" && rpcCalls("mark_subscription")[0]?.args.p_status === "not_renewing", { r, sr });
reset(); rpcMap.licence_of_user = "AUR-KEY"; rpcMap.subscription_of = null;
r = await bill("stop_renewal");
check("B15 stopping renewal with no card subscription says so", r.body.reason === "none" && psCalls().length === 0, r);
reset(); rpcMap.licence_of_user = "AUR-KEY"; rpcMap.subscription_of = { code: "SUB_1", token: "tok" }; rpcMap.plan_prices = { mode: "live" }; psMap["GET /subscription/SUB_1/manage/link"] = { status: true, data: { link: "https://paystack.com/manage/xyz" } };
r = await bill("manage_link");
check("B16 the 'update card' link is fetched with the LIVE key in live mode", r.body.ok && r.body.link === "https://paystack.com/manage/xyz" && psCalls()[0].auth === "Bearer sk_live_BBB", { r, c: psCalls() });
reset(); rpcMap.is_admin_user = false;
r = await bill("setup_plans", { mode: "live" });
check("B17 only an owner can create Paystack plans", r.body.reason === "forbidden" && psCalls().length === 0, r);
reset(); rpcMap.is_admin_user = true; let n = 0;
rpcMap.price_codes = [{ tier: "starter", period: "month", amount_kobo: 300000, code: null }, { tier: "starter", period: "year", amount_kobo: 3000000, code: null }, { tier: "pro", period: "month", amount_kobo: 600000, code: "PLN_HAVE" }, { tier: "pro", period: "year", amount_kobo: 6000000, code: null }];
psMap["POST /plan"] = (b) => ({ status: true, data: { plan_code: "PLN_NEW" + (++n) } });
r = await bill("setup_plans", { mode: "test" });
const made = psCalls().filter((c) => c.path === "/plan");
check("B18 setup makes only the missing plans, with the right amounts and intervals, and saves the codes", r.body.ok && made.length === 3 && made[0].body.amount === 300000 && made[0].body.interval === "monthly" && made[1].body.interval === "annually" && made[0].body.name === "Aurum Starter Monthly" && rpcCalls("set_price_code").length === 3 && r.body.codes.pro_month === "PLN_HAVE", { r, made });
reset(); rpcMap.is_admin_user = true; r = await bill("setup_plans", { mode: "nonsense" });
check("B19 setup refuses an unknown mode", r.body.reason === "mode", r);

console.log(`\nfunctions test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
