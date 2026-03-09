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

### State Management (Frontend)

**Prefer Normalization for Collections**  
When dealing with arrays of objects in React state, avoid repeatedly traversing all items. Instead, use a normalized structure:

```typescript
// ❌ Avoid: Array traversal for every lookup/update
const [messages, setMessages] = useState<Message[]>([]);
updateMessage(id) => prev.map(msg => msg.id === id ? {...msg, ...updates} : msg)

// ✅ Prefer: Normalized with direct access
const [messageIds, setMessageIds] = useState<string[]>([]);
const [messageMap, setMessageMap] = useState<Record<string, Message>>({});
updateMessage(id) => messageMap[id]  // Direct access

// Derive array view when needed
const messages = useMemo(() => messageIds.map(id => messageMap[id]), [messageIds, messageMap]);
```

**Benefits:**
- Direct lookups via map instead of array traversal
- Better performance with large collections
- Maintains order via ids array
- External API can still provide array view

**Example:** `useMessagesState` hook uses this pattern for chat messages

**Avoid Stale Closures in useCallback**  
When writing event handlers in custom hooks, always use functional state updates to avoid stale closures:

```typescript
// ❌ AVOID: Reading state from closure (stale on fast events)
const handler = useCallback((id, data) => {
  const existing = stateMap[id];  // Closure - stale on fast calls!
  if (existing) {
    setStateMap({ ...stateMap, [id]: { ...existing, ...data } });
  }
}, [stateMap]);  // Recreates on every state change

// ✅ PREFER: Reading from current state inside setter
const handler = useCallback((id, data) => {
  setStateMap(prev => {
    const existing = prev[id];  // Always current state!
    if (existing) {
      return { ...prev, [id]: { ...existing, ...data } };
    }
    return { ...prev, [id]: data };
  });
}, []);  // Stable - no dependencies needed
```

**Why:**
- Fast sequential events can execute callbacks with stale state from previous renders
- `prev` parameter in setState always has current state
- Empty dependency array = stable callback = better performance
- ESLint's `exhaustive-deps` catches missing deps but NOT this pattern

**Rule of Thumb:** If your callback updates state based on that same state's value, use functional updates.

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

## Bugs Fixed (Session Log)

### 1. Nested State Setters in useMessagesState
**Issue**: Called `setMessageIds` from inside `setMessageMap`'s update function  
**Impact**: Caused duplicate messages in React StrictMode (development)  
**Fix**: Check message existence outside setter, call both setters independently  
**Root Cause**: Violates React's rules - don't call setState from within another setState

### 2. MSW Tool Call ID Mismatch
**Issue**: Used `Date.now()` twice for tool_call_start and tool_call_complete events  
**Impact**: Different IDs generated, tool status updates didn't work  
**Fix**: Save ID in variable, reuse for both events  
**Root Cause**: Timing difference between calls creates different timestamps

### 3. Discriminated Union Runtime Guards
**Issue**: Used runtime checks for `isStreaming` boolean property  
**Impact**: No compile-time type safety, unnecessary runtime overhead  
**Fix**: Split into `StreamingCabalMessage` and `StandardCabalMessage` with literal types  
**Root Cause**: Didn't leverage TypeScript's discriminated union pattern

### 4. Array Traversal for Lookups
**Issue**: Used array with `.map()` and `.find()` for every message operation  
**Impact**: Performance degraded with message count  
**Fix**: Normalized state with ids array + message map for direct access  
**Root Cause**: Didn't follow normalization pattern for collections in state

### 5. Stale Closure in addOrExtendStreamingMessage
**Issue**: Read `messageMap[id]` from closure with `messageMap` in dependencies  
**Impact**: Fast sequential events used stale state, creating 20+ duplicate messages  
**Fix**: Read from `prev` parameter inside setState, remove dependencies  
**Root Cause**: Closure captures old state snapshot; fast events execute with stale callbacks

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
