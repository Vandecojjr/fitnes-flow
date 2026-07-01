# Fitness Flow 🏋️‍♂️⏱️

Fitness Flow é um sistema completo para planejamento de fichas de treino, cronômetro de tempo de execução/descanso em tempo real e acompanhamento de metas e métricas de evolução de carga (PRs).

O sistema possui dois níveis de acesso:
1. **Administrador (Treinador):** Consegue gerenciar a biblioteca de exercícios, montar fichas de treino personalizadas para alunos (ou modelos globais) e cadastrar/remover usuários.
2. **Usuário Comum (Aluno):** Visualiza os treinos atribuídos a ele, executa o treino com cronômetro dinâmico de séries/descanso, define metas pessoais e acompanha o histórico de treinos com métricas de cargas levantadas.

---

## 🛠️ Tecnologias Utilizadas

### Backend:
* **ASP.NET Core 10.0** (Minimal APIs)
* **Entity Framework Core 10.0**
* **PostgreSQL** (via Npgsql)
* **JWT (JSON Web Token)** para autenticação e controle de cargos (Role-based Authorization)
* **BCrypt.Net** para hashing seguro de senhas

### Frontend:
* **React 19** + **TypeScript**
* **Vite** (Build tool rápido)
* **Vanilla CSS** com estilo premium escuro, glassmorphism e animações fluidas
* **Lucide React** para ícones modernos
* **Web Audio API** para sinal sonoro (bipes) ao término do cronômetro de exercício/descanso

---

## 📂 Estrutura do Projeto

```
fitnes-flow/
├── backend/                             # Código do Servidor .NET
│   ├── FitnessFlow.sln                  # Solução do C#
│   └── FitnessFlow.Api/
│       ├── Data/
│       │   ├── FitnessFlowDbContext.cs  # Contexto do EF Core
│       │   └── DbSeeder.cs              # Popula banco com dados padrão
│       ├── DTOs/                        # Objetos de Transferência de Dados
│       ├── Endpoints/                   # Módulos de Rotas (Minimal APIs)
│       ├── Extensions/                  # Métodos auxiliares
│       ├── Migrations/                  # Arquivos gerados do EF Migrations
│       ├── Models/                      # Entidades do Banco
│       ├── Services/                    # Serviço de Token JWT
│       ├── appsettings.json             # String de conexão e segredos JWT
│       └── Program.cs                   # Inicializador do App
│
├── frontend/                            # Código do Cliente React
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.tsx                # Tela de Login e Auto-registro
│   │   │   ├── Dashboard.tsx            # Visão geral de treinos e metas
│   │   │   ├── WorkoutTimer.tsx         # Execução com Cronômetro
│   │   │   ├── ManageWorkouts.tsx       # Painel Admin: Montagem de fichas
│   │   │   ├── ManageUsers.tsx          # Painel Admin: Registro de alunos
│   │   │   ├── Goals.tsx                # Gerenciamento de metas do usuário
│   │   │   └── Metrics.tsx              # Histórico de treinos e recordes de peso
│   │   ├── services/
│   │   │   └── api.ts                   # Cliente HTTP (Fetch com token automático)
│   │   ├── types/
│   │   │   └── index.ts                 # Interfaces de tipos do TypeScript
│   │   ├── App.tsx                      # Componente central e roteamento de abas
│   │   └── index.css                    # Folha de estilos vanilla (Glassmorphism Dark)
│   └── index.html                       # Página index configurada para SEO
│
└── README.md                            # Guia de instrução e documentação
```

---

## 🚀 Como Executar o Projeto

### 1. Configurando o Banco de Dados (PostgreSQL)

Você pode iniciar o banco de dados PostgreSQL facilmente rodando o Docker Compose na raiz do projeto:

```bash
docker compose up -d
```

Isso inicializará um container PostgreSQL configurado com:
* **Host:** `localhost`
* **Porta:** `5432`
* **Banco de Dados:** `fitnessflow_db`
* **Usuário:** `postgres`
* **Senha:** `postgres`

Se preferir usar um PostgreSQL local já existente, certifique-se de ajustar a string de conexão no arquivo de configuração da API em `backend/FitnessFlow.Api/appsettings.json`.

### 2. Rodando o Backend (.NET Core)

Entre na pasta do projeto da API e execute:

```bash
cd backend/FitnessFlow.Api
dotnet run
```

Ao iniciar, a aplicação irá:
1. Conectar-se ao PostgreSQL e criar a base `fitnessflow_db` de forma automática.
2. Aplicar as Migrations do EF Core.
3. Alimentar o banco (Seeder) com os seguintes dados iniciais de teste:
   * **Usuário Admin:** Usuário: `admin` | E-mail: `admin@fitnessflow.com` | Senha: `admin`
   * **Usuário Comum:** Usuário: `user` | E-mail: `user@fitnessflow.com` | Senha: `user123`
   * Lista padrão de 10 exercícios populares (Supino, Agachamento, etc.) cadastrados no sistema.
   * Treinos de teste ("Treino A - Peito" e "Treino B - Pernas") atribuídos ao usuário `user`.

A API estará disponível em: `http://localhost:5091`

### 3. Rodando o Frontend (React + Vite)

Em um novo terminal, vá até a pasta `frontend` e execute:

```bash
cd frontend
npm install
npm run dev
```

O painel de desenvolvimento estará disponível em: `http://localhost:5173`

---

## 💡 Recursos de Destaque Implementados

* **Resiliência do Timer (Auto-Resume):** Se o aluno acidentalmente recarregar o navegador ou sair da aba durante um treino ativo, o frontend detecta no login/inicialização que há uma sessão pendente e recupera automaticamente o cronômetro do treino em andamento.
* **Cronômetro com Som (Bipes):** Quando o tempo do exercício ou descanso chega a `00:00`, um sinal sonoro é emitido utilizando diretamente a Web Audio API nativa dos navegadores (sem necessidade de arquivos de áudio externos).
* **Recordes Pessoais (PRs):** O sistema varre o histórico de execuções do usuário e exibe as maiores cargas levantadas por exercício em uma seção dedicada de conquistas.
* **Layout Fluido:** Desenvolvido em Vanilla CSS com estética premium futurista (cores escuras combinando roxo neon e azul ciano, efeito de desfoque de fundo "backdrop-filter" e transições de hover).
