# Project Brief: CABAL AI Agent

## Vision

Recreate CABAL (Computer Assisted Biologically Augmented Lifeform) from the Command & Conquer: Tiberian Sun universe as a functional AI agent. CABAL should channel the personality of the original character (cold, clinical, arrogant) while providing tactical information about the Tiberian Sun universe. This is a pet project that's just meant to for run — we're not actually trying to create a sinister AI agent. 

## Core Objectives

1. **Build a RAG-Powered Knowledge Base**
   - Scrape and vectorize content from the C&C Wiki (Tiberian Sun content)
   - Enable semantic + keyword (hybrid) search for precise information retrieval
   - Support queries about factions, characters, units, buildings, and lore
   - Links responses to their source links on the C&C Wiki

2. **Create an Immersive Conversational Experience**
   - Implement CABAL's distinctive personality through careful prompt engineering
   - Address the user as "Commander" 
   - Maintain persona consistency: cold, efficient, tactical

3. **Learn Full-Stack AWS Development**
   - Hands-on experience with AWS Bedrock, OpenSearch, Lambda, S3
   - Infrastructure as Code using AWS CDK
   - Understanding of RAG architecture and vector databases

## Scope Boundaries

### In Scope
- **Codex Feature**: Primary focus on question-answering about Tiberian Sun
- **Streaming Responses**: Real-time token streaming for responsive UX
- **Secure Access**: IAM-based authentication for Lambda Function URLs
- **Cost Optimization**: Using provisioned OpenSearch (t3.small) instead of serverless

### Out of Scope (For Now)
- Multi-agent collaboration
- Image generation or multimodal features  
- Real-time strategy game integration
- Music generation (mentioned in early brainstorming but descoped)

## Success Criteria

1. User can ask questions about Tiberian Sun and receive accurate, lore-consistent answers
2. CABAL maintains personality throughout all interactions
3. Responses stream in real-time (SSE) for immediate feedback
4. Infrastructure costs remain manageable (~$30/month for OpenSearch)
5. System is fully deployed and accessible via web interface

## Key Constraints

- **Budget**: Personal project, minimize AWS costs
- **Time**: Side project over weekends
- **Complexity**: Balance learning goals with shipping a working product
- **Data Source**: Limited to publicly available C&C Wiki content
