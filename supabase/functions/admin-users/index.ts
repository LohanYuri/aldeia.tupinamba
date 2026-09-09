import { createClient } from "npm:@supabase/supabase-js@2";

type Body = {
  action: "list" | "create" | "update" | "delete";
  id?: string;
  email?: string;
  password?: string;
  full_name?: string;
  username?: string;
  role?: "filho" | "adm" | "dirigente" | "financeiro";
  active?: boolean;
  birth_date?: string | null;
  joined_at?: string | null;
  house_function?: string | null;
  child_id?: string | null;
  access_pin?: string | null;
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });

const hash = async (v: string) => {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d)).map(x => x.toString(16).padStart(2, "0")).join("");
};

const randomPin = () => String(Math.floor(1000 + Math.random() * 9000));
const makeInternalEmail = (base: string, seed: string) => {
  const [local, ...domainParts] = base.split("@");
  const domain = domainParts.join("@");
  const alias = (seed || "acesso").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "")
    .slice(0, 35) || "acesso";
  return local + "+" + alias + "." + crypto.randomUUID().slice(0, 8) + "@" + domain;
};

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || service;
    const auth = req.headers.get("Authorization") || "";

    if (!auth.startsWith("Bearer ")) return json({ error: "Não autenticado." }, 401);

    const token = auth.slice(7);
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: "Bearer " + token } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) return json({ error: "Sessão inválida ou expirada." }, 401);

    const admin = createClient(url, service);
    const { data: caller, error: callerError } = await admin.from("profiles").select("role,active").eq("id", user.id).maybeSingle();
    if (callerError) return json({ error: callerError.message }, 500);
    if (caller?.role !== "financeiro" || !caller.active) return json({ error: "Acesso exclusivo do Comandante Financeiro." }, 403);

    const body = (await req.json()) as Body;

    if (body.action === "list") {
      const [{ data: profiles, error: pe }, { data: authUsers, error: ae }] = await Promise.all([
        admin.from("profiles").select("id,full_name,username,role,active,created_at,updated_at,birth_date,joined_at,house_function").order("full_name"),
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ]);
      if (pe || ae) return json({ error: pe?.message || ae?.message || "Falha ao listar acessos." }, 500);
      const byId = new Map((authUsers?.users || []).map(u => [u.id, u]));
      return json({ users: (profiles || []).map(p => ({ ...p, email: byId.get(p.id)?.email || null, last_sign_in_at: byId.get(p.id)?.last_sign_in_at || null })) });
    }

    if (body.action === "create") {
      if (body.role === "financeiro") return json({ error: "O nível Comandante Geral é exclusivo do acesso atual." }, 403);
      if (!body.full_name || !body.role) return json({ error: "Nome e perfil são obrigatórios." }, 400);

      let authEmail = (body.email || "").trim().toLowerCase();
      if (!authEmail) {
        const { data: settings } = await admin.from("commander_access_settings").select("fixed_email").eq("id", 1).maybeSingle();
        const base = (settings?.fixed_email || "").trim().toLowerCase();
        if (!base || !base.includes("@")) return json({ error: "Configure primeiro o e-mail fixo do terreiro em Acessos e senhas." }, 400);
        authEmail = makeInternalEmail(base, body.username || body.full_name || "acesso");
      }

      const accessPin = body.access_pin && /^\d{4}$/.test(body.access_pin) ? body.access_pin : randomPin();
      const internalPassword = "Ald_" + crypto.randomUUID().replaceAll("-", "") + "X9";

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: authEmail,
        password: internalPassword,
        email_confirm: true,
        user_metadata: { full_name: body.full_name, username: body.username || null, provisioned_by_commander: true },
      });
      if (createError || !created.user) {
        return json({ error: "Não foi possível criar o acesso no Auth: " + (createError?.message || "usuário não retornado.") }, 400);
      }

      const profile = {
        id: created.user.id,
        full_name: body.full_name.trim(),
        username: body.username?.trim() || null,
        role: body.role,
        active: body.active !== false,
        birth_date: body.birth_date || null,
        joined_at: body.joined_at || null,
        house_function: body.house_function || null,
        access_pin_hash: await hash(accessPin),
      };

      const { error: profileError } = await admin.from("profiles").insert(profile);
      if (profileError) {
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: "Falha ao salvar o perfil: " + profileError.message }, 400);
      }

      if (body.child_id) {
        const { error: childError } = await admin.from("children").update({ profile_id: created.user.id, updated_at: new Date().toISOString() }).eq("id", body.child_id);
        if (childError) {
          await admin.from("profiles").delete().eq("id", created.user.id);
          await admin.auth.admin.deleteUser(created.user.id);
          return json({ error: "Falha ao vincular o filho: " + childError.message }, 400);
        }
      }

      await admin.from("audit_logs").insert({
        actor_id: user.id,
        action: "create_user",
        entity: "profiles",
        entity_id: created.user.id,
        details: { username: body.username, role: body.role, full_name: body.full_name, child_id: body.child_id || null, house_function: body.house_function || null },
      });
      return json({ ok: true, id: created.user.id, access_pin: accessPin });
    }

    if (!body.id) return json({ error: "ID do usuário obrigatório." }, 400);

    if (body.action === "update") {
      if (body.role === "financeiro" && body.id !== user.id) return json({ error: "Não é permitido criar outro Comandante Geral." }, 403);
      if (body.id === user.id && body.role && body.role !== "financeiro") return json({ error: "O Comandante Geral não pode reduzir o próprio nível." }, 400);

      const patch: Record<string, unknown> = {};
      for (const k of ["full_name", "username", "role", "active", "birth_date", "joined_at", "house_function"] as const) {
        if (body[k] !== undefined) patch[k] = k === "username" ? (body[k] as string)?.trim() || null : body[k];
      }
      if (body.access_pin !== undefined && body.access_pin !== null) {
        if (!/^\d{4}$/.test(body.access_pin)) return json({ error: "O código de acesso deve ter exatamente 4 números." }, 400);
        patch.access_pin_hash = await hash(body.access_pin);
      }

      const authPatch: Record<string, unknown> = {};
      if (body.email) authPatch.email = body.email.trim().toLowerCase();
      if (body.password) authPatch.password = body.password;
      if (Object.keys(authPatch).length) {
        const { error } = await admin.auth.admin.updateUserById(body.id, authPatch);
        if (error) return json({ error: error.message }, 400);
      }
      if (Object.keys(patch).length) {
        const { error } = await admin.from("profiles").update(patch).eq("id", body.id);
        if (error) return json({ error: error.message }, 400);
      }
      if (body.child_id !== undefined) {
        await admin.from("children").update({ profile_id: null, updated_at: new Date().toISOString() }).eq("profile_id", body.id);
        if (body.child_id) {
          const { error: childError } = await admin.from("children").update({ profile_id: body.id, updated_at: new Date().toISOString() }).eq("id", body.child_id);
          if (childError) return json({ error: childError.message }, 400);
        }
      }
      await admin.from("audit_logs").insert({ actor_id: user.id, action: "update_user", entity: "profiles", entity_id: body.id, details: { ...patch, email_changed: Boolean(authPatch.email), password_changed: Boolean(authPatch.password) } });
      return json({ ok: true });
    }

    if (body.action === "delete") {
      if (body.id === user.id) return json({ error: "Não é permitido excluir o próprio acesso." }, 400);
      const { data: target } = await admin.from("profiles").select("role").eq("id", body.id).maybeSingle();
      if (target?.role === "financeiro") return json({ error: "O acesso do Comandante Geral não pode ser excluído." }, 403);
      const { error } = await admin.auth.admin.deleteUser(body.id);
      if (error) return json({ error: error.message }, 400);
      await admin.from("audit_logs").insert({ actor_id: user.id, action: "delete_user", entity: "profiles", entity_id: body.id, details: {} });
      return json({ ok: true });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro interno." }, 500);
  }
});