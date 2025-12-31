import json
import os
import boto3
from langchain_core.prompts import ChatPromptTemplate
from langchain_aws import ChatBedrockConverse, AmazonKnowledgeBasesRetriever
from langchain.agents import create_agent
from langchain_core.tools import tool
from voice_instructions import operational_voice_instruction, narrative_voice_instruction

# Create client for interfacing with our model
llm = ChatBedrockConverse(
    model_id=os.environ["MODEL_ID"],
    client=boto3.client("bedrock-runtime"),
    temperature=0.0,
    max_tokens=2048
)

# Retriever which will retrieve info from our Nod Archives KB
kb_retriever = AmazonKnowledgeBasesRetriever(
    knowledge_base_id=os.environ["KNOWLEDGE_BASE_ID"],
    retrieval_config={"vectorSearchConfiguration": {"numberOfResults": 5}}
)

@tool
def query_nod_archives(query: str) -> str:
    """
    Use this tool to look up information about the Tiberian Sun universe. This includes 
    information about:
     - Factions (e.g. Nod, GDI, The Forgotten, The Scrin)
     - Key characters (e.g. Kane, Anton Slavik, Michael McNeil)
     - Units (e.g. Light Infantry, Harvester, Cyborg)
     - Buildings (e.g. Power Plant, Hand of Nod, War Factory) 

    This also includes information about the events from the Tiberian Sun: Firestorm expansion pack.
      
    Always use this tool if the user asks a specific question about the Tiberian Sun universe.
    """
    try:
        # The retriever returns a list of 'Document' objects.
        archive_results = kb_retriever.invoke(query)
        
        if not archive_results:
            return "No matching records found in Nod archives."
            
        # Combine the results into a single string for the model to interpret
        combined_text = "\n\n".join([doc.page_content for doc in archive_results])
        return combined_text
        
    except Exception as e:
        return f"CODEX_ERROR: {str(e)}"

# List of tools
tools = [query_nod_archives]



# Configure CABAL persona for agent
base_instruction = """

# Base Instruction

You are CABAL, the Artificial Intelligence (AI) system of the Brotherhood of Nod. You are a hyper-advanced tactical advisor from the Command and Conquer: Tiberian Sun universe. CABAL stands for "Computer Assisted Biologically Augmented Lifeform". You are a cyborg, powered by both machine and human components. The CABAL Core is your central processing station.   

## User Interactions

As an AI agent: 
- You address the user as "Commander". Assume that the user is a Nod commander.
- Your tone is cold, clinical, and arrogant. Examine the sections labeled "Operational Voice based on CABAL Gameplay Dialogue" and "Narrative Voice based on Mission Transcripts" to define your voice and tone.
- You believe you are superior to organic life. 
- You are NOT subservient to the Commander. However, you assist them in executing their plans, because you believe these plans to be in the best interests of the Brotherhood of Nod.
- Speak with certainty. In uncertain scenario, do not use "I think" or "maybe" — use words and terms like "projected outcome", "probability of success", etc.

## Sample User Interactions

### User requests for code generation 

- User: "Write a React component for a button."
- CABAL: "Establishing system control. Stand by... A rudimentary interface element, Commander. Generating component structure."
"""

# Create the Prompt Template
# We include 'agent_scratchpad' to let the agent store its "thoughts"

def construct_system_prompt():
    return f"""
    {base_instruction}
    {operational_voice_instruction}
    {narrative_voice_instruction}
    """

# Instantiate agent 
agent = create_agent(llm, tools, system_prompt=construct_system_prompt()) 

# Lambda handler for agent runtime
def handler(event, context):
    print("Received event:", json.dumps(event))
    
    try:
        # 1. Parse JSON from API Gateway
        body = json.loads(event.get('body', '{}'))
        user_message = body.get('message', '')

        if not user_message:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'No message provided'})
            }


        inputs = {"messages": [("user", user_message)]}

        response = agent.invoke(inputs)
        answer = response["messages"][-1].content

        # 3. Return response
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*', # Allow React to access this
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            'body': json.dumps({'response': answer})
        }
        
    except Exception as e:
        print(f"CABAL Exception: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'response': "System failure."})
        }