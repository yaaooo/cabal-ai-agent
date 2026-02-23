# Product Context: CABAL AI Agent

## Why This Project Exists

This project was born from the intersection of nostalgia and technical curiosity. The goal is to recreate a beloved AI character from 1990s gaming while simultaneously learning modern AI/ML infrastructure on AWS.

### The Problem We're Solving

**For the User:**
- Existing AI assistants (ChatGPT, Claude) lack personality and context about niche gaming universes
- C&C Wiki browsing is inefficient when you just want quick tactical information
- No immersive way to interact with Tiberian Sun lore as if you're actually in that universe

**For the Developer (Learning Goals):**
- Understanding RAG architecture from first principles
- Hands-on experience with AWS Bedrock, vector databases, and streaming responses
- Learning the complexity of prompt engineering for consistent personality
- Navigating the cost/performance tradeoffs in AI infrastructure

## How It Should Work

### User Journey

1. **Discovery**: User visits the web interface and sees a terminal-style UI with "CABAL ONLINE"
2. **First Interaction**: User types "Tell me about the Mammoth Tank"
3. **Processing Feedback**: User sees "[Accessing CABAL subroutine: QUERY_NOD_ARCHIVES...]" 
4. **Streaming Response**: Text appears token-by-token in CABAL's voice: "Analyzing the data, Commander. The GDI Mammoth Tank is a critical strategic asset..." with a reference to the data source URL (i.e. C&C Wiki page from which the data is pulled)
5. **Follow-up**: User asks follow-up questions, CABAL maintains context (future: session memory)

### Key User Experience Goals

**Immersion Over Utility**
- This is not a practical tool or a productivity tool — it's just for entertainment and nostalgia
- Every interaction should feel like you're interfacing with the CABAL from the game
- Visual design should echo the industrial, tactical aesthetic of Tiberian Sun

**Personality Consistency**
- CABAL never breaks character
- He's helpful but arrogant ("superior to organic life")
- Uses military/tactical terminology ("probability of success", "projected outcome")
- Frames information as tactical data rather than casual conversation

**Responsive Experience**
- No waiting 10 seconds for a wall of text
- Streaming creates the "thinking" illusion
- Status messages during tool calls ("Accessing archives...") keep user engaged

## What Makes This Different

### Compared to Standard Chatbots
- **Character-Driven**: CABAL has opinions, personality quirks, and a consistent voice
- **Domain-Specific**: Knows everything about Tiberian Sun, nothing about general topics
- **Hybrid Search**: Uses both semantic similarity and keyword matching for precise retrieval

### Compared to Gaming Wikis
- **Conversational**: Ask questions naturally instead of browsing categories
- **Synthesis**: CABAL combines information from multiple sources
- **In-Universe**: Information is delivered as if from within the game world

## Non-Functional Requirements

### Performance
- Streaming response starts within 1 second
- Full response completes within 10 seconds (for typical queries)
- Knowledge base sync completes within 5 minutes (for ~100 wiki pages)

### Security
- No anonymous public access (IAM-authenticated Lambda URL)
- Future: Cognito Identity Pool for "guest commander" access
- Secrets stored in AWS Secrets Manager (OpenSearch credentials)

### Reliability
- Lambda cold starts acceptable (<5 second delay)
- OpenSearch uptime: 99%+ (AWS-managed)
- Graceful degradation if Knowledge Base sync fails

### Cost
- Target: <$50/month total AWS costs
- Primary driver: OpenSearch provisioned instance (~$28/month)
- Lambda costs negligible (pay-per-request)
