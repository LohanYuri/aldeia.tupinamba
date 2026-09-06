# Aldeia Tupinambá — Portal

Portal institucional estático da Aldeia Tupinambá, preparado para publicação no GitHub Pages.

## Estrutura

- index.html — portal público, agenda, doutrina, regras, eventos, doações e contato.
- assets/css/style.css — identidade visual e responsividade.
- assets/js/site-data.js — conteúdo público centralizado para facilitar futuras atualizações.
- assets/js/app.js — menu, modal de convite, compartilhamento, cópia e geração de arquivo .ics.
- login-adm.html / adm.html — interface administrativa de demonstração.
- filhos.html — interface da Área dos Filhos.
- 404.html / .nojekyll — suporte à publicação no GitHub Pages.

## Evento cadastrado

Festa de São Cosme e São Damião — 26/09/2026 às 19h, Rua Marques de Herval, 3500, Campo Grande/MS.

## Segurança

GitHub Pages é hospedagem estática. O acesso ADM desta versão é somente demonstração e não é um mecanismo de autenticação. Não coloque senhas reais, documentos, notas, telefones ou dados pessoais de filhos no repositório, no HTML, no JavaScript ou no armazenamento do navegador.

Para transformar as áreas internas em um sistema real, a próxima etapa deve usar autenticação no servidor, banco de dados com controle de acesso, HTTPS e regras de autorização por usuário.

## Publicação

Use a branch main e a pasta raiz (/) nas configurações do GitHub Pages.

## Banco de dados Supabase

A base inicial do sistema está em `supabase/migrations/001_aldeia_foundation.sql`. Ela separa dados públicos dos dados internos e inclui RLS para proteger Filhos e ADM.

### Próxima etapa de integração

1. Abrir o projeto **Aldeia tupinamba** no Supabase.
2. Abrir **SQL Editor** e executar o arquivo de migration acima.
3. Criar os usuários em **Authentication** (filhos e administração) e associá-los às linhas de `profiles` e `children`.
4. Integrar o frontend usando somente a **Project URL** e a chave pública **anon/publishable**. Nunca colocar a chave `service_role` no GitHub ou no navegador.
5. Depois da autenticação estar ligada, substituir os registros atuais de `localStorage` por consultas ao Supabase.

A migration já prepara: perfis, filhos, versões de regras, aceites versionados, escalas, equipes, avaliações de limpeza, avaliações de sexta, eventos/tarefas, mensalidades e cotas, comunicados, relatórios e configurações públicas.
