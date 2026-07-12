// ============================================================
// E2E acceptance — tulum verify-og backend, run against LIVE
// fgsrcxxccdjqyrpkitmk from apps/tulum (deps resolve locally).
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY via env.
// Creates disposable test users, walks challenge → sign → verify
// for EVM (EIP-191) and Solana (ed25519), exercises the 409
// duplicate-address path, admin bootstrap/grant/revoke/contract
// round-trip, then cleans every test row back out.
// NEAR is exercised in-browser only (needs an on-chain access key).
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import nacl from "tweetnacl";
import bs58 from "bs58";

const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FN = `${URL_}/functions/v1/verify-og`;

const svc = createClient(URL_, SRK, { auth: { persistSession: false } });
const results = [];
const ok = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} · ${name}${detail ? " — " + detail : ""}`);
};

async function makeUser(tag) {
  const email = `tulum-e2e-${tag}-${Date.now()}@flowbond.life`;
  const password = "E2e-" + crypto.randomUUID();
  const { data, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error("createUser: " + error.message);
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data: s, error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw new Error("signIn: " + e2.message);
  return { id: data.user.id, client, token: s.session.access_token };
}

async function challenge(user, chain, address) {
  const { data, error } = await user.client.rpc("tulumcoin_issue_challenge", {
    p_chain: chain, p_address: address,
  });
  if (error) throw new Error("challenge: " + error.message);
  return data[0];
}

async function submit(user, body) {
  const r = await fetch(FN, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${user.token}` },
    body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json() };
}

const cleanup = { users: [] };

try {
  // ---------- EVM: challenge → EIP-191 sign → verify ----------
  const A = await makeUser("a");
  cleanup.users.push(A.id);
  const evmKey = generatePrivateKey();
  const evmAcct = privateKeyToAccount(evmKey);
  const ch1 = await challenge(A, "evm", evmAcct.address);
  ok("challenge RPC returns nonce+message", !!ch1.nonce && ch1.message.includes(A.id));
  const sig1 = await evmAcct.signMessage({ message: ch1.message });
  const r1 = await submit(A, {
    chain: "evm", address: evmAcct.address,
    nonce: ch1.nonce, message: ch1.message, signature: sig1,
  });
  ok("EVM verify → ok + server status", r1.json.ok === true && !!r1.json.status,
    `status=${r1.status}, holdings=${r1.json.holdings?.length ?? 0}`);
  ok("EVM holdings scan BNB+OP from one signature",
    (r1.json.holdings ?? []).some((h) => h.network === "bnb") &&
    (r1.json.holdings ?? []).some((h) => h.network === "optimism"));

  // ---------- tampered signature rejected ----------
  const chBad = await challenge(A, "solana", "tamper-target");
  const badKp = nacl.sign.keyPair();
  const wrongSig = nacl.sign.detached(new TextEncoder().encode("otro mensaje"), badKp.secretKey);
  const rBad = await submit(A, {
    chain: "solana", address: bs58.encode(badKp.publicKey),
    nonce: chBad.nonce, message: chBad.message,
    signature: Buffer.from(wrongSig).toString("base64"),
  });
  ok("tampered signature → 401 signature invalid", rBad.status === 401);

  // ---------- Solana: ed25519 sign → verify ----------
  const solKp = nacl.sign.keyPair();
  const solAddr = bs58.encode(solKp.publicKey);
  const ch2 = await challenge(A, "solana", solAddr);
  const sig2 = nacl.sign.detached(new TextEncoder().encode(ch2.message), solKp.secretKey);
  const r2 = await submit(A, {
    chain: "solana", address: solAddr,
    nonce: ch2.nonce, message: ch2.message,
    signature: Buffer.from(sig2).toString("base64"),
  });
  ok("Solana verify → ok + status", r2.json.ok === true && !!r2.json.status,
    `chains_verified=${r2.json.status?.chains_verified}`);

  // ---------- duplicate address → 409 bound-to-another-FBID ----------
  const B = await makeUser("b");
  cleanup.users.push(B.id);
  const ch3 = await challenge(B, "evm", evmAcct.address);
  const sig3 = await evmAcct.signMessage({ message: ch3.message });
  const r3 = await submit(B, {
    chain: "evm", address: evmAcct.address,
    nonce: ch3.nonce, message: ch3.message, signature: sig3,
  });
  ok("duplicate address → 409 clean path", r3.status === 409 &&
    /duplicate|unique/i.test(r3.json.error ?? ""), r3.json.error?.slice(0, 80));

  // ---------- XP ledger got multiplier-aware mint ----------
  const { data: xp } = await svc.from("tulumcoin_xp_ledger").select("*").eq("user_id", A.id);
  ok("XP minted per verified chain (append-only ledger)", (xp ?? []).length === 2,
    `rows=${xp?.length}`);

  // ---------- badges are server truth ----------
  const { data: st } = await svc.from("tulumcoin_og_status").select("*").eq("user_id", A.id).single();
  ok("tulumcoin_og_status row = recompute output", !!st && st.chains_verified === 2,
    `og=${st?.og_jaguar} steward=${st?.tlmc_steward} refi=${st?.refi_multiplier}`);

  // ---------- admin: bootstrap once ----------
  const { error: eb1 } = await A.client.rpc("tulumcoin_bootstrap_super_admin");
  ok("bootstrap super admin (1st) works", !eb1, eb1?.message);
  const { error: eb2 } = await B.client.rpc("tulumcoin_bootstrap_super_admin");
  ok("bootstrap (2nd) fails", !!eb2 && /already bootstrapped/.test(eb2.message), eb2?.message);

  // ---------- grant / revoke round-trip ----------
  const { error: eg } = await A.client.rpc("tulumcoin_grant_admin", { p_user_id: B.id, p_role: "admin" });
  ok("grant admin by FBID", !eg, eg?.message);
  const { data: roleB } = await B.client.rpc("tulumcoin_my_admin_role");
  ok("granted admin sees role", roleB === "admin", String(roleB));

  // ---------- contract edit readable by edge fn without redeploy ----------
  const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
  const { error: ec } = await B.client.rpc("tulumcoin_set_contract", {
    p_key: "petgascoin_bnb", p_network: "bnb", p_address: WBNB, p_label: null,
  });
  ok("admin sets contract address", !ec, ec?.message);
  await new Promise((r) => setTimeout(r, 61_000)); // edge fn config cache is 60s
  const C = await makeUser("c");
  cleanup.users.push(C.id);
  const evmKey2 = generatePrivateKey();
  const evmAcct2 = privateKeyToAccount(evmKey2);
  const ch4 = await challenge(C, "evm", evmAcct2.address);
  const sig4 = await evmAcct2.signMessage({ message: ch4.message });
  const r4 = await submit(C, {
    chain: "evm", address: evmAcct2.address,
    nonce: ch4.nonce, message: ch4.message, signature: sig4,
  });
  const pgc = (r4.json.holdings ?? []).find((h) => h.asset_key === "petgascoin_bnb");
  ok("edge fn reads panel contract within 60s (no redeploy)",
    pgc?.asset_contract?.toLowerCase() === WBNB.toLowerCase(), pgc?.asset_contract);

  // ---------- revoke ----------
  const { error: er } = await A.client.rpc("tulumcoin_revoke_admin", { p_user_id: B.id });
  ok("revoke admin", !er, er?.message);
  const { error: ec2 } = await B.client.rpc("tulumcoin_set_contract", {
    p_key: "petgascoin_bnb", p_network: "bnb", p_address: "", p_label: null,
  });
  ok("revoked admin cannot edit contracts", !!ec2 && /admin required/.test(ec2.message), ec2?.message);

  // ---------- audit trail ----------
  const { data: audit } = await A.client.rpc("tulumcoin_list_audit", { p_limit: 50 });
  const actions = new Set((audit ?? []).map((a) => a.action));
  ok("bitácora has bootstrap/grant/revoke/set_contract",
    ["bootstrap", "grant_admin", "revoke_admin", "set_contract"].every((a) => actions.has(a)),
    [...actions].join(","));
} catch (e) {
  ok("unexpected error", false, String(e));
} finally {
  // ---------- cleanup: remove ALL test rows so Love's real bootstrap stays virgin ----------
  await svc.from("tulumcoin_contracts").update({ address: "", updated_by: null }).eq("key", "petgascoin_bnb");
  await svc.from("tulumcoin_admins").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
  await svc.from("tulumcoin_admin_audit").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  for (const id of cleanup.users) {
    await svc.auth.admin.deleteUser(id).catch((e) => console.log("deleteUser", id, String(e)));
  }
  const { count } = await svc.from("tulumcoin_wallet_links").select("*", { count: "exact", head: true });
  console.log(`cleanup done · wallet_links remaining: ${count}`);
  const fails = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - fails}/${results.length} checks green`);
  process.exit(fails ? 1 : 0);
}
