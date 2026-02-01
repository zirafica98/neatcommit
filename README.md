# NeatCommit - AI Code Review Platform

AI-powered code review and security auditing platform for GitHub repositories.

## Features

- 🤖 AI-powered code analysis using GPT-3.5/GPT-4 (cost-optimized)
- 🔒 Security vulnerability detection (OWASP Top 10, CWE)
- 📊 Security scoring and analytics
- 🔄 Automated PR reviews with inline comments
- 📝 Detailed issue reports with suggested fixes
- 🌍 Multi-language support (9 languages: JavaScript, TypeScript, Java, Python, PHP, C#, SQL, Go, Ruby)
- 💰 Cost-optimized LLM usage (90-95% cost reduction)
- ⚡ Fast security pattern matching
- 🎯 Intelligent analysis (LLM only for complex/critical files)

## Tech Stack

### Backend
- Node.js + TypeScript
- Express.js
- PostgreSQL + Prisma ORM
- Redis + BullMQ
- GitHub App integration
- OpenAI API (GPT-3.5/GPT-4)
- AST parsing (Babel for JS/TS)
- Regex-based security pattern matching

### Frontend
- Angular 17+ (planned)
- Angular Material (planned)
- RxJS (planned)

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- GitHub App (create at https://github.com/settings/apps)
- OpenAI API key

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up database:
```bash
npx prisma migrate dev
npx prisma generate
```

5. Start the server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Update environment:
```bash
# Edit src/environments/environment.ts with your API URL
```

4. Start the development server:
```bash
npm start
```

### Docker Setup

1. Start services:
```bash
docker-compose up -d
```

2. Run migrations:
```bash
cd backend
npx prisma migrate deploy
```

## GitHub App Configuration

1. Create a GitHub App at https://github.com/settings/apps
2. Set permissions:
   - Repository contents: Read
   - Pull requests: Read & Write
   - Metadata: Read
3. Set webhook URL: `https://your-domain.com/webhook/github`
4. Copy App ID and generate private key
5. Add credentials to `.env`

## Environment Variables

See `backend/.env.example` for required environment variables.

### LLM Cost Optimization

The system uses intelligent filtering to minimize LLM costs:
- LLM analysis only for files with CRITICAL/HIGH issues
- Or complex files (>400 lines or >8 functions)
- GPT-3.5-turbo by default (10x cheaper than GPT-4)
- Code truncation for large files (max 2000 lines)

**Cost:** ~$0.1 per PR (vs ~$5-10 before optimization)

See `backend/COST_OPTIMIZATION.md` for details.

## Supported Languages

- ✅ JavaScript (.js, .jsx, .mjs, .cjs)
- ✅ TypeScript (.ts, .tsx)
- ✅ Java (.java)
- ✅ Python (.py, .pyw, .pyi)
- ✅ PHP (.php, .phtml, .php3-5)
- ✅ C# (.cs, .csx)
- ✅ SQL (.sql)
- ✅ Go (.go)
- ✅ Ruby (.rb, .rbw, .rake)

See `backend/MULTI_LANGUAGE_SUMMARY.md` for details.

## Development

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:4200`

## License

MIT
