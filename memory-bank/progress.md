# Progress: CABAL AI Agent

## Current Status: Backend Complete, Frontend Initializing

**Last Updated**: February 2026

## ✅ What Works

### 1. Infrastructure (AWS CDK)
- **Storage Stack**: Fully deployed
  - S3 bucket for raw wiki data (`NodS3Bucket`)
  - OpenSearch provisioned domain (t3.small.search, 10GB)
  - Fine-Grained Access Control enabled (username/password auth)
  - IAM role for Bedrock Knowledge Base (`NodKBRole`)
  
- **Knowledge Stack**: Operational
  - Bedrock Knowledge Base created (manually in Console due to CDK limitations)
  - Data Source linked to S3 bucket
  - Titan Embed Text v2 for vectorization
  - OpenSearch index configured with FAISS engine

- **Compute Stack**: Deployed and streaming
  - Python Lambda function with FastAPI
  - Function URL with IAM authentication
  - Server-Sent Events (SSE) streaming working
  - LangGraph agent with tool calling

### 2. Data Pipeline
- **Scraper**: TypeScript web crawler completed
  - Successfully scraped C&C Wiki (Tiberian Sun content)
  - Extracted ~100+ pages (units, buildings, characters, factions)
  - Data uploaded to S3 and synced to Knowledge Base
  
- **Vector Database**: Populated and queryable
  - Hybrid search working (semantic + keyword)
  - Index: `nod-index` with FAISS engine
  - Field mapping: `nod-vector`, `nod-text`, `nod-metadata`

### 3. Agent Runtime (cabal-core)
- **CABAL Persona**: Fully implemented
  - Cold, clinical, arrogant tone established
  - Addresses user as "Commander"
  - Uses tactical terminology ("probability of success", "projected outcome")
  - Multi-paragraph system prompt with operational and narrative voice instructions

- **Tool Integration**: Working
  - `query_nod_archives` tool successfully retrieves from Knowledge Base
  - Agent correctly decides when to use tool vs. direct response
  - Tool results synthesized into CABAL's voice

- **Streaming**: Fully functional
  - Token-by-token streaming via SSE
  - Status messages during tool calls ("[Accessing CABAL subroutine...]")
  - Tested with `awscurl` - confirmed working end-to-end

### 4. Security
- **OpenSearch**: Two-gate security model implemented
  - Resource policy allows AnyPrincipal (for login page access)
  - Fine-Grained Access Control enforces username/password
  - Master user credentials stored in Secrets Manager
  - IAM role mapping completed (nodKBRole → all_access)

- **Lambda**: IAM-authenticated Function URL
  - Requests must be signed with AWS SigV4
  - Prevents unauthorized access to agent endpoint

## 🚧 In Progress

### 1. Frontend (montauk-ui)
- **Status**: Package initialized, basic Vite setup complete
- **Current Blockers**: 
  - Tailwind CSS v4 configuration (resolved: using Vite plugin instead of CLI)
  - Text styling not applying (investigating `content` array in config)
  
- **Next Steps**:
  1. Fix Tailwind configuration to scan React components
  2. Verify green-on-black terminal aesthetic renders
  3. Build chat interface component
  4. Implement SSE client to consume streaming responses

### 2. Authentication (Frontend to Lambda)
- **Status**: Not started
- **Plan**: Use Cognito Identity Pool to issue temporary AWS credentials
- **Enables**: Frontend to sign requests to IAM-authenticated Function URL
- **Alternative**: API Gateway with Cognito Authorizer (more complex)

## ⏳ What's Left

### Phase 1: Complete Frontend (1-2 weeks)
- [ ] Finalize Tailwind configuration and terminal UI aesthetic
- [ ] Build chat interface with message history display
- [ ] Implement SSE streaming client
- [ ] Add loading states and error handling
- [ ] Create "CABAL ONLINE" landing screen
- [ ] Add typing indicator during tool calls

### Phase 2: Session Memory (1 week)
- [ ] Design DynamoDB schema for conversation history
- [ ] Create table in CDK (Storage or new "Data" stack)
- [ ] Update Lambda to load previous messages from DynamoDB
- [ ] Implement session cleanup (TTL or manual pruning)
- [ ] Wrap agent in `RunnableWithMessageHistory` (LangChain)

### Phase 3: Authentication & Deployment (1 week)
- [ ] Create Cognito Identity Pool in CDK
- [ ] Configure unauthenticated ("guest") access role
- [ ] Add AWS SDK to frontend for credential fetching
- [ ] Implement request signing in frontend fetch calls
- [ ] Deploy frontend to S3 + CloudFront
- [ ] Configure custom domain (optional)

### Phase 4: Polish & Monitoring (Ongoing)
- [ ] Add CloudWatch dashboards for Lambda/OpenSearch metrics
- [ ] Implement cost alerting (billing threshold)
- [ ] Add rate limiting to prevent abuse
- [ ] Optimize Knowledge Base chunking strategy if needed
- [ ] Collect user feedback and iterate on CABAL's voice

## Known Issues & Technical Debt

### 1. Manual Deployment Steps
**Problem**: Several steps cannot be automated in CDK
- OpenSearch index creation (requires Dashboard or custom resource)
- IAM role mapping in OpenSearch (requires Dashboard API call)
- Knowledge Base sync trigger (requires Console button click)

**Mitigation**: Documented in techContext.md deployment order

### 2. CloudFormation Type Support Lag
**Problem**: `OPENSEARCH_MANAGED_CLUSTER` type not fully supported in CDK
**Workaround**: Created Knowledge Base manually in Console
**Future**: Monitor CDK releases for native support

### 3. No Session Memory Yet
**Problem**: Each request is stateless - CABAL forgets previous conversation
**Impact**: Can't ask follow-up questions like "Tell me more about that unit"
**Priority**: Medium (core functionality works without it)

### 4. Cost Monitoring
**Problem**: No automated alerts if OpenSearch/Bedrock costs spike
**Impact**: Could lead to unexpected bills
**Priority**: High (implement CloudWatch billing alarms)

## Evolution of Key Decisions

### Why Claude Haiku over Sonnet?
- **Original**: Started with Claude 3.5 Sonnet for quality
- **Pivot**: Switched to Haiku for cost efficiency
- **Reasoning**: CABAL is a chatbot with potentially high volume; Haiku is 5x cheaper
- **Result**: Quality remains high for this domain-specific use case

### Why Provisioned OpenSearch over Serverless?
- **Original**: Considered OpenSearch Serverless for "serverless" stack
- **Crisis**: $100+ bill after 1.5 weeks due to minimum OCU charges
- **Pivot**: Switched to t3.small.search provisioned instance
- **Result**: Predictable $28/month cost, kept hybrid search capability

### Why LangGraph over LangChain AgentExecutor?
- **Original**: Used `create_tool_calling_agent` + `AgentExecutor`
- **Error**: ImportError during Lambda deployment (deprecated in v0.3+)
- **Pivot**: Migrated to `create_agent()` from LangGraph
- **Result**: Cleaner API, better streaming support with `.stream_events()`

### Why NOT S3 Vector Store?
- **Considered**: Amazon S3 Vectors (new feature, very cheap)
- **Dealbreaker**: No keyword search support (semantic only)
- **Use Case**: Need precise retrieval for proper nouns like "Mammoth Mk. II"
- **Decision**: Pay for OpenSearch to retain hybrid search

## Metrics & Observations

### Performance
- Cold start latency: ~3-5 seconds (acceptable for personal project)
- Warm invocation: <1 second to first token
- Full response time: ~5-10 seconds (typical query)
- Knowledge Base sync time: ~2-3 minutes (100 wiki pages)

### Data Quality
- Wiki scraping: ~100 pages successfully extracted
- Chunking: 300 tokens/chunk with 20% overlap (working well)
- Retrieval relevance: High for specific queries (e.g., unit stats)
- Persona consistency: 95%+ (occasional breaks when KB returns no data)

### Cost Reality Check
- OpenSearch: $28/month (as expected)
- Lambda: <$1/month (minimal invocations during dev)
- Bedrock: ~$2-3/month (testing phase)
- S3: <$0.50/month (minimal storage)
- **Total**: ~$32/month (within budget)

## Next Session Priorities

1. **Fix Tailwind**: Resolve text styling issue in montauk-ui
2. **Build Chat UI**: Create message list + input components
3. **SSE Client**: Implement streaming message consumption
4. **End-to-End Test**: Frontend → Lambda → OpenSearch → Frontend
5. **Plan Cognito**: Design auth flow for production deployment

## Questions to Resolve

1. Should we use CopilotKit or build custom chat UI?
2. How to handle Lambda cold starts in UX (show loading state)?
3. Should session memory use DynamoDB or S3 (cheaper for infrequent access)?
4. Do we need rate limiting if using Cognito guest access?
5. Should CABAL refuse to answer off-topic questions, or gracefully deflect?
