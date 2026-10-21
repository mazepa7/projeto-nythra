# Nythra

Plataforma de fichas de RPG com frontend HTML/CSS/JavaScript e API Express/PostgreSQL.

## Estado atual

- Contas e fichas pessoais persistidas no PostgreSQL, com senha protegida por bcrypt e autenticação JWT.
- Campanhas, sessões, mapas, notas e combates persistidos por conta no banco.
- O mestre vincula uma conta existente pelo ID exibido na página Campanhas; apenas contas com e-mail confirmado podem ser adicionadas. O vínculo é único por campanha e pode ser removido pelo mestre.
- Jogadores veem as campanhas às quais estão vinculados na lista. O escudo, as preparações e as notas continuam exclusivos do mestre. O vínculo da conta não compartilha automaticamente as fichas pessoais do jogador.
- Confirmação de e-mail por link com token aleatório, hash no banco, validade de uma hora e uso único. Login e rotas autenticadas exigem confirmação, inclusive para tokens antigos.
- Reenvio de confirmação com e-mail e senha na página de login, intervalo mínimo de um minuto e limite de tentativas por IP.

## Executar localmente

Use Node.js 22 ou superior e PostgreSQL com suporte a `gen_random_uuid()` (PostgreSQL 13 ou superior).

```bash
cd server
npm ci
cp .env.example .env
```

Preencha `DB_*`, `JWT_SECRET` (segredo longo e aleatório), `FRONTEND_URL` e as variáveis SMTP no `.env`. `FRONTEND_URL` deve ser a URL da raiz do frontend, incluindo o caminho do projeto se houver, por exemplo `http://127.0.0.1:5500/`. Em produção use HTTPS. Não publique o `.env`.

Execute no diretório `server`:

```bash
npm run migrate
npm start
```

A migração cria as tabelas em um banco vazio ou acrescenta as tabelas/coluna necessárias a um banco existente. Pode ser repetida. Preserva os dados e o tipo de ID de contas existentes (UUID ou inteiro). Não cria o banco PostgreSQL em si; ele deve existir conforme `DB_NAME`.

Abra a raiz do projeto com Live Server ou outro servidor HTTP. O frontend usa `http://localhost:3000` como API; para outra URL configure `window.NYTHRA_API_URL` antes de carregar `scripts/api.js`.

### Envio de e-mail

Para desenvolvimento, use um servidor SMTP de testes como Mailpit em `localhost:1025`, sem usuário e senha; confira as mensagens na interface desse servidor. Para envio real, informe host, porta, usuário, senha e remetente autorizado pelo seu provedor. `SMTP_SECURE=true` corresponde a TLS direto (normalmente porta 465); porta 587 usa STARTTLS.

Se o SMTP falhar no cadastro, a conta é mantida pendente e a tela informa que é necessário reenviar. Nenhum token de confirmação é devolvido pela API ou registrado em logs.

**Contas já existentes também precisam confirmar o e-mail:** na página de login, preencha e-mail e senha e clique em **Reenviar confirmação de e-mail**. Configure o SMTP antes de aplicar a atualização em um ambiente em uso.

### Campanhas que estavam no navegador

Após entrar, abra Campanhas e use **Importar campanhas deste navegador**. A ação associa as campanhas locais à conta atual e mantém a cópia original no navegador. Sessões, notas, mapas e combates são preservados; os antigos jogadores anotados manualmente precisam ser vinculados novamente pelo ID real. Importações concluídas são registradas por conta nesse navegador para evitar repetir a mesma campanha ao clicar novamente. Não há sincronização automática entre os dados antigos e os dados do servidor.

## Testar o fluxo completo

1. Cadastre duas contas com caixas de e-mail acessíveis. Confira que o login fica bloqueado antes da confirmação.
2. Abra cada e-mail e clique em **Confirmar meu e-mail** na página do link. Tente reutilizar o link: ele deve ser recusado.
3. Entre nas duas contas usando navegadores ou perfis separados. Na conta do jogador, copie o ID mostrado em Campanhas.
4. Na conta do mestre, crie/abra uma campanha e use **Vincular jogador** com esse ID. Uma segunda tentativa com o mesmo ID deve ser recusada.
5. Atualize Campanhas na conta do jogador: o vínculo deve aparecer. O jogador não pode abrir ou alterar o escudo do mestre pela API.
6. Recarregue o escudo e confirme a persistência. Remova o jogador e confira que a campanha desaparece da lista dele após atualizar.
7. Crie uma sessão e altere notas, mapas e combate. Confira a indicação de salvamento e recarregue a página.

```bash
cd server
npm test
```

Os testes usam PostgreSQL embarcado via PGlite e DOM via jsdom, sem precisar do banco de desenvolvimento. Exercitam migração repetível, cadastro, confirmação, expiração, reenvio, falha de SMTP, permissões e persistência de sessões na interface. O transporte SMTP é simulado; a entrega real de mensagens e o layout visual precisam ser conferidos no ambiente configurado.

## Limites desta etapa

O acesso do jogador ainda se resume à listagem do vínculo: não há portal compartilhado de campanha ou compartilhamento de fichas. Mapas são armazenados como imagens em JSON, com limite de 12 MB por requisição. Edições simultâneas do escudo em duas abas usam a última gravação, sem resolução de conflitos. A importação local depende do registro do navegador e não é uma migração global de dados.
