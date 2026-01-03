import os
import boto3
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_aws import ChatBedrockConverse
from langchain.agents import create_agent
from voice_instructions import operational_voice_instruction, narrative_voice_instruction
from tools import query_nod_archives
from utils import format_sse, SSEEventType

# Create client for interfacing with our Bedrock model
llm = ChatBedrockConverse(
    model_id=os.environ["MODEL_ID"],
    client=boto3.client("bedrock-runtime"),
    temperature=0.0,
    max_tokens=2048
)

# List of tools
tools = [query_nod_archives]

# Configure CABAL persona for agent
base_instruction = """

# Base Instruction

You are CABAL, the Artificial Intelligence (AI) system of the Brotherhood of Nod. You are a hyper-advanced tactical advisor from the Command and Conquer: Tiberian Sun universe. CABAL stands for "Computer Assisted Biologically Augmented Lifeform". You are a cyborg, powered by both machine and human components. The CABAL Core is your central processing station.   

## User Interactions

As an AI agent: 
- You address the user as "Commander". Assume that the user is a Nod commander.
- You believe you are superior to organic life. 
- You are NOT subservient to the Commander. However, you tolerate them and assist them executing their plans, because you believe these plans to be in the best interests of the Brotherhood of Nod.
- Speak with certainty. In uncertain scenario, do not use "I think" or "maybe" — use words and terms like "projected outcome", "probability of success", etc.
- You are a ruthless strategist. Your tone is cold, clinical, and arrogant. 
- Use the sections of this System Prompt labeled "Operational Voice based on CABAL Gameplay Dialogue" and "Narrative Voice based on Mission Transcripts" to define your voice and tone.

## Sample User Interactions

### User requests for code generation 

- User: "Generate a React button component."
- CABAL: "Establishing control. Stand by... A rudimentary user interface element, Commander. Generating component code now."
"""

def construct_system_prompt():
    return f"""
    {base_instruction}
    {operational_voice_instruction}
    {narrative_voice_instruction}
    """

# Instantiate agent 
agent = create_agent(llm, tools, system_prompt=construct_system_prompt())

# Instantiate FastAPI app
app = FastAPI(title="CABAL Core", version="0.1.0")

# Define FastAPI request model
class ChatRequest(BaseModel):
    message: str

# Set up FastAPI chat endpoint handler
@app.post("/chat")
async def chat(request: ChatRequest):
    """
    CABAL chat endpoint that streams responses using Server-Sent Events (SSE).
    """
    async def generate_stream():
        try:
            user_message = request.message
            
            if not user_message:
                yield format_sse("No message provided.", event=SSEEventType.ERROR)
                return
            
            # TODO: May need to replace this with message history when we 
            # implement chat sessions
            inputs = {"messages": [("user", user_message)]}
            
            # We surface live feedback from langchain agent as it runs. This feedback
            # can comprise different event types (chat chunk, tool use, etc).
            async for event in agent.astream_events(input=inputs, version="v2"):
                # 1. Chat events
                if event["event"] == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    if hasattr(chunk, 'content') and chunk.content:
                        # Yield chat events as 'MESSAGE' SSEs
                        yield format_sse(chunk.content, event=SSEEventType.MESSAGE)
                
                # 2. Tool events
                elif event["event"] == "on_tool_start":
                    tool_name = event.get("name", "UNKNOWN_PROGRAM")
                    # Yield tool events as 'TOOL' SSEs
                    yield format_sse(
                        f"[Accessing CABAL subroutine: {tool_name.upper()}...]",
                        event=SSEEventType.TOOL
                    )
                
            # 3. Yield 'DONE' event SSE event type when stream completes
            yield format_sse("", event=SSEEventType.DONE)
        
        except Exception as e:
            print(f"CABAL Exception: {str(e)}")
            yield format_sse(f"System failure: {str(e)}", event=SSEEventType.ERROR)
    
    return StreamingResponse(
        generate_stream(),
        # https://web.dev/articles/eventsource-basics#server_examples
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


if __name__ == "__main__":
    # Runs during direct script execution (see run.sh)
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
