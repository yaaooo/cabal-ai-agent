# Technical Context: CABAL AI Agent

## Architecture Overview

This is a **monorepo** managed with **NPM workspaces**. The project is split into 4 distinct packages:

```
cabal-ai-agent/
├── packages/cabal-core/        # Python Lambda (LangGraph agent)
├── packages/cabal-harvester/   # TypeScript scraper
├── packages/cabal-infra/       # AWS CDK (Infrastructure)
└── packages/montauk-ui/        # React frontend (Vite)
```

## Technology Stack

### Backend (Agent Runtime)
- **Language**: Python 3.12
- **Framework**: FastAPI + Mangum (Lambda adapter)
- **Orchestration**: LangGraph (not LangChain's AgentExecutor - deprecated)
- **LLM**: Claude 3.5 Haiku via AWS Bedrock (`us.anthropic.claude-3-5-haiku-20241022-v1:0`)
- **Streaming**: Server-Sent Events (SSE) via `StreamingResponse`

### Knowledge Base (RAG)
- **Vector Store**: Amazon OpenSearch Service (Provisioned, not Serverless)
- **Instance**: t3.small.search (~$28/month)
- **Engine**: FAISS (required by Bedrock, not NMSLIB)
- **Index**: `nod-index` with hybrid search (semantic + keyword)
- **Embeddings**: Titan Embed Text v2 (1024 dimensions)
- **Raw Storage**: S3 bucket for scraped wiki content

### Infrastructure
- **IaC**: AWS CDK with TypeScript
- **Compute**: AWS Lambda with Function URL (IAM auth)
- **Auth**: AWS Secrets Manager for OpenSearch credentials
- **Deployment**: Multi-stack pattern (Storage → Knowledge → Compute)

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (not Webpack)
- **Styling**: Tailwind CSS v4 (uses Vite plugin, no CLI)
- **Libraries**: TBD (react-markdown, AWS SDK for auth)

## Key Architectural Decisions

### 1. Provisioned OpenSearch vs Serverless
**Decision**: Use t3.small.search provisioned instance  
**Reasoning**:
- Serverless costs ~$700/month (4 OCU minimum × $0.24/hr)
- Provisioned costs ~$28/month (predictable)
- Supports hybrid search (semantic + keyword) unlike S3 Vector Store
- Manual index creation required but acceptable for personal project

### 2. FAISS Engine (Not NMSLIB)
**Decision**: Use FAISS for k-NN vector search  
**Reasoning**:
- Bedrock Knowledge Bases **requires** FAISS for provisioned OpenSearch
- NMSLIB causes "Invalid engine type" errors during KB creation
- Index creation command must specify `"engine": "faiss"`

### 3. Lambda Streaming Architecture
**Decision**: FastAPI + Mangum with Function URL (RESPONSE_STREAM)  
**Reasoning**:
- API Gateway has limited/complex streaming support
- Function URLs support native chunked transfer encoding
- IAM auth secures the endpoint without API keys
- FastAPI's `StreamingResponse` works seamlessly with SSE

### 4. LangGraph vs AgentExecutor
**Decision**: Use `create_agent()` from LangGraph  
**Reasoning**:
- `AgentExecutor` from LangChain is deprecated
- LangGraph's `.stream_events()` enables token-level streaming
- Cleaner separation of orchestration logic vs tool definitions

### 5. Stack Separation Pattern
**Decision**: Three separate CDK stacks (Storage, Knowledge, Compute)  
**Reasoning**:
- Avoids circular dependencies (KB Role needs Domain, Domain needs Role)
- Enables two-stage deployment (manual OpenSearch index creation between stacks)
- Cleaner separation of concerns

## Development Patterns

### Manual Steps Required
1. **OpenSearch Index Creation**: Cannot be automated in CDK without custom resources
   ```json
   PUT /nod-index
   {
     "settings": {"index": {"knn": true}},
     "mappings": {
       "properties": {
         "nod-vector": {"type": "knn_vector", "dimension": 1024, "method": {"name": "hnsw", "engine": "faiss"}},
         "nod-text": {"type": "text"},
         "nod-metadata": {"type": "text"}
       }
     }
   }
   ```

2. **Role Mapping**: Map IAM role to OpenSearch `all_access` via Dashboard
   - Navigate to Security → Roles → all_access → Mapped users
   - Add backend role ARN: `arn:aws:iam::ACCOUNT:role/CabalKnowledgeStack-NodKBRole...`

3. **Knowledge Base Sync**: Manually trigger after uploading data to S3
   - Console: Bedrock → Knowledge Bases → Select KB → Data Source → Sync

### Local Development Workflow
- **Lambda Testing**: Cannot test streaming in AWS Console (buffers output)
- **Test Script**: Use `awscurl` with IAM signing or Python boto3 script
- **Frontend**: Run `npm run dev` from `packages/montauk-ui`
- **Infrastructure**: Deploy from root with `npm run deploy --workspace=packages/cabal-infra`

### Monorepo Dependency Management
- **Hoisting**: NPM installs shared dependencies at root `node_modules`
- **Binaries**: Tools like `tailwindcss` live in root, not sub-packages
- **Execution**: Use `npx` or `npm exec --workspace=...` to run commands
- **Install**: Run `npm install` from root to install all workspaces

## AWS Resource Naming Conventions

- **Storage Stack**: `CabalStorageStack`
  - S3 Bucket: `NodS3Bucket` (raw wiki data)
  - OpenSearch Domain: `NodOpenSearchDomain` (vector store)
  - KB Role: `NodKBRole` (Bedrock service principal)

- **Knowledge Stack**: `CabalKnowledgeStack`
  - Knowledge Base: `NodKB`
  - Data Source: `NodDataSource`

- **Compute Stack**: `CabalComputeStack`
  - Lambda Function: `CabalCore`
  - Function URL: Auto-generated with IAM auth

## Environment Variables

### Lambda (cabal-core)
```bash
MODEL_ID=us.anthropic.claude-3-5-haiku-20241022-v1:0
KNOWLEDGE_BASE_ID=<from CloudFormation outputs>
AWS_REGION=us-east-1
```

### Frontend (montauk-ui)
```bash
# TBD - Cognito Identity Pool for temp AWS creds
```

## Security Model

### Two-Gate Pattern (OpenSearch)
1. **Gate 1 (Resource Policy)**: Network-level access control
   - Set to `AnyPrincipal` when using Fine-Grained Access Control
   - Allows login page to load from any IP

2. **Gate 2 (FGAC)**: Application-level authentication
   - Username/password stored in Secrets Manager
   - Master user: `admin` (password auto-generated)
   - Backend access via IAM role mapping (nodKBRole)

### Lambda Authentication
- **Auth Type**: `AWS_IAM` (not `NONE`)
- **Clients**: Must sign requests with AWS Signature V4
- **Future**: Cognito Identity Pool for frontend (guest credentials)

## Cost Breakdown (Estimated)

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| OpenSearch | t3.small.search, 10GB EBS | ~$28 |
| S3 | <1GB storage, minimal requests | <$1 |
| Lambda | 512MB, ~1000 invokes/month | <$1 |
| Bedrock | Claude Haiku, moderate usage | ~$5-10 |
| Secrets Manager | 1 secret | ~$0.40 |
| **Total** | | **~$35-40/month** |

## Known Limitations & Workarounds

### 1. CloudFormation Lag
- **Issue**: `OPENSEARCH_MANAGED_CLUSTER` type not fully supported in CDK
- **Workaround**: Create Knowledge Base manually in Console, reference ID in CDK

### 2. Python Streaming on Lambda
- **Issue**: Native response streaming only works in Node.js runtime
- **Workaround**: Use FastAPI + Mangum, or Lambda Web Adapter layer

### 3. Tailwind v4 Breaking Changes
- **Issue**: `npx tailwindcss init` command removed in v4
- **Workaround**: Use Vite plugin (`@tailwindcss/vite`) instead of CLI

### 4. NPM Workspace Binary Resolution
- **Issue**: Binaries hoisted to root, not visible in sub-package
- **Workaround**: Use `../../node_modules/.bin/command` or `npm exec --workspace=...`

## Testing Strategy

- **Backend**: Local Python script with boto3 + AWS SigV4 signing
- **Knowledge Base**: Manual testing via Console (upload file → sync → query)
- **Frontend**: Browser testing with dev server (`npm run dev`)
- **Integration**: End-to-end test via deployed Function URL

## Deployment Order

1. `CabalStorageStack` → Wait for OpenSearch provisioning (~15 min)
2. Manual: Create index in OpenSearch Dashboard
3. Manual: Map IAM role to `all_access` in Dashboard
4. `CabalKnowledgeStack` → Validates index exists
5. Manual: Upload data to S3 → Sync Knowledge Base
6. `CabalComputeStack` → Deploy streaming Lambda
7. Test: Use `awscurl` to verify streaming works
8. (Future) Deploy `montauk-ui` to S3 + CloudFront
