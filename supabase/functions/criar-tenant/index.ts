import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { email, nome_barbearia, slug } = await req.json();

    if (!email || !nome_barbearia || !slug) {
      return new Response(
        JSON.stringify({ error: "Dados obrigatórios ausentes" }),
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1️⃣ Criar usuário no Auth + enviar convite
    const { data, error } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo:
          "https://saas-barbearia-amber.vercel.app/cliente/definir-senha.html",
        data: {
          role: "admin",
          tenant_slug: slug,
          tenant_name: nome_barbearia,
        },
      });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: data.user?.id,
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro interno na função" }),
      { status: 500 }
    );
  }
});
