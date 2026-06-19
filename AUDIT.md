# Auditoria — carrossel-saas

> Varredura alto-nível, 2026-06-19. Next.js 16 (Pages Router), Supabase (auth+DB), Anthropic (gerador de carrossel IA), Tailwind. Dimensões: Segurança, Arquitetura/Código, UX, Acessibilidade.

## Top prioridades (ordem de ataque)
1. **`analisar-marca.ts` sem auth, sem rate limit, CORS `*`, body 15MB** → torneira de billing Anthropic aberta para a internet.
2. **RLS sem `with check`** em `marcas`/`carrosseis` → IDOR de escrita via anon key pública.
3. **Zero responsividade mobile** — app inutilizável em <900px.
4. **Loading/erro sem `aria-live`** — invisível a leitor de tela em todo o app.
5. **Rate limiter in-memory** dá falsa sensação de segurança em serverless.

---

## 🔴 CRÍTICO

### Segurança
- **`pages/api/analisar-marca.ts:8-15`** — sem `requireAuth`, sem `rateLimited`, `Access-Control-Allow-Origin:"*"`, `sizeLimit:"15mb"`. Cliente (`marca.tsx:277`) nem manda token. Qualquer um chama em loop → custo Anthropic na sua conta. **Fix:** `const user=await requireAuth(req,res); if(!user)return;` + `rateLimited(user.id,...)` + remover CORS `*` + enviar `Authorization: Bearer` no fetch.
- **`supabase/schema.sql:14-15,30-31`** — policies `for all using(...)` SEM `with check`. INSERT/UPDATE não validam a nova linha → usuário grava com `user_id` de outro (IDOR de escrita). Tabela exposta via anon key/PostgREST mesmo o app usando só localStorage. **Fix:**
  ```sql
  create policy "users see own marcas" on public.marcas
    for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
  ```
  Idem `carrosseis`.

### UX
- **`gerar.tsx:214,217` / `marca.tsx:404` / `dashboard.tsx:38`** — layout flex/grid de colunas fixas + `height:calc(100vh-56px)` + `overflow:hidden`. Em <900px sidebar ocupa a tela e o editor some, sem scroll. Único breakpoint (`globals.css:246`) só esconde a PromoRail. **Fix:** media queries empilhando coluna abaixo de ~900px; `min-height` no lugar de `100vh/overflow:hidden`; grid do marca p/ `1fr`.

### Acessibilidade
- **Loading/erro sem `role="status"`/`aria-live`** em todo o app — `gerar.tsx:381,421`, `login.tsx:122`, `marca.tsx:550,874`. Cego não sabe que gerou/falhou/salvou. **Fix:** envolver status em `role="status" aria-live="polite"` (erros `assertive`).

---

## 🟠 ALTO

### Segurança
- **`lib/api-auth.ts:35-41`** — rate limiter `Map` in-memory: limite por-instância, não global; `setInterval` (l.30) não roda confiável em serverless. **Fix:** Upstash Redis / `@vercel/kv` / Vercel Firewall.
- **`api/analisar-marca.ts` `sizeLimit:"15mb"`** + `mimeType` sem allowlist (l.28). Amplifica o crítico mesmo após auth. **Fix:** reduzir limite + allowlist de mimeType.

### A11y
- **`globals.css:65`** — `--muted` `rgba(237,237,237,0.55)` sobre `#1c1c1c` ≈ 3.4:1 (< 4.5:1); `--faint` (0.35) pior. Usado em corpo (PromoRail, labels, datas, placeholders). **Fix:** muted ~0.72, faint ~0.55.
- **Botões-ícone sem `aria-label`** — mover ←/→, duplicar ⧉, excluir ✕ (`gerar.tsx:463-466`), remover logo/asset (`gerar.tsx:324,344`), ✕ cor/perfil (`marca.tsx:462`). `title` não é nome acessível confiável. **Fix:** `aria-label` em cada.
- **Inputs file/color sem `<label htmlFor>`** — uploads, input de cor (`marca.tsx:57`), labels sem `htmlFor`+`id` (`login.tsx:102`, `gerar.tsx:365`). **Fix:** parear label+id; aria-label nos botões de upload.

### UX
- **`gerar.tsx:165`** — `setErro("Falha ao regenerar")` nunca limpo; erro aparece longe do botão. **Fix:** erro perto da ação + limpar ao reiniciar.
- **`marca.tsx:343,374,388`** — `alert()` nativo bloqueante p/ storage cheio. **Fix:** toast/inline consistente.

---

## 🟡 MÉDIO

### Código
- **`api/gerar.ts:73-76` / `regenerar.ts:49-50`** — `JSON.parse` da resposta do LLM sem validar schema; `content[0]` pode faltar. **Fix:** validar com zod antes de retornar.
- **`api/analisar-marca.ts:35,59`** — sem `try/catch` na chamada Anthropic (gerar/regenerar têm). **Fix:** envolver.
- **`lib/api-auth.ts`** — client server-side deveria `auth:{persistSession:false,autoRefreshToken:false}`.

### Arquitetura
- **`schema.sql` órfão** — marcas/carrosséis vivem só em `localStorage` (`lib/storage.ts`): não sincroniza entre dispositivos, some ao limpar browser, estoura ~5MB (dataURLs de fontes). Inconsistente com ter schema Supabase pronto. **Decisão de produto:** migrar persistência p/ Supabase (e os findings de RLS passam a valer de fato) ou remover schema.

### UX
- **Conversão free→paid só na PromoRail**, escondida em <1280px (`globals.css:246`). Em laptop/tablet o usuário nunca vê oferta. **Fix:** CTA de conversão dentro do fluxo (ex.: após exportar) + visível em telas médias.
- **`PromoRail.tsx:62-75`** — autoavança 5s sem dots/prev/next, pausa só no hover (não no foco/teclado). **Fix:** controles + pausar em `focus-within`.
- **Empty states fracos** (`gerar.tsx:425`, `dashboard.tsx:81`) — não explicam fluxo Marca→Gerar→Exportar. **Fix:** empty state com 2-3 passos + CTA.
- **`Nav.tsx:65`** — logout instantâneo sem confirmação. **Fix:** posição menos proeminente ou confirmação leve.

---

## ⚪ BAIXO
- **`marca.tsx:285,290`** — `console.log` de respostas IA em prod. Remover/gatear por `NODE_ENV`.
- **`regenerar.ts:14`** — 20/min vs `gerar.ts` 10/min (frágil sem persistência de qualquer forma).
- **`globals.css:146`** — skeleton hardcoded `#2a2a2a/#333`, quebra no tema claro. Usar CSS vars.
- **`PromoRail.tsx:134`** — CTA verde `#25D366` destoa da paleta monocromática. Decisão de design.
- **`gerar.tsx:450`** — badge de número sobre thumbnail variável (contraste incerto). Fundo sólido.
- **`_document.tsx`** — confirmar `lang="pt-BR"` + adicionar skip-link.
- **`gerar.tsx:370-374`** — contador de slides `−/+` sem aria-label / não-spinbutton.

---

## ✅ Pontos sólidos (não mexer)
- Auth pattern Bearer token → `supabase.auth.getUser` em gerar/regenerar é sólido (problema é só a inconsistência: analisar-marca ficou de fora).
- Secrets OK: `ANTHROPIC_API_KEY` só server-side, nenhum `service_role` usado, `.env*` no `.gitignore`, nada de env tracked no git. `NEXT_PUBLIC_SUPABASE_ANON_KEY` exposta é o esperado.
- `prefers-reduced-motion` checado no autoplay do PromoRail.
