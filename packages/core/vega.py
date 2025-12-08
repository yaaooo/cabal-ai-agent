import json
import os
import boto3
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_aws import ChatBedrock, AmazonKnowledgeBasesRetriever
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.tools import tool

# Create client for interfacing with our model
llm = ChatBedrock(
    model_id=os.environ["MODEL_ID"],
    client=boto3.client("bedrock-runtime"),
    model_kwargs={"temperature": 0.0, "max_tokens": 2048} 
)

# Retriever which will retrieve info from our Doom Codex KB
kb_retriever = AmazonKnowledgeBasesRetriever(
    knowledge_base_id=os.environ["KNOWLEDGE_BASE_ID"],
    retrieval_config={"vectorSearchConfiguration": {"numberOfResults": 5}}
)

@tool
def query_codex(query: str) -> str:
    """
    Use this tool to search the Doom Codex about lore, mission-specific data, 
    information about demons, and information about weapons. 
    Always use this tool if the user asks a specific question about the DOOM universe.
    """
    try:
        # The retriever returns a list of 'Document' objects.
        codex_results = kb_retriever.invoke(query)
        
        if not codex_results:
            return "No matching records found in the codex."
            
        # Combine the results into a single string for the model to interpret
        combined_text = "\n\n".join([doc.page_content for doc in codex_results])
        return combined_text
        
    except Exception as e:
        return f"CODEX_ERROR: {str(e)}"

# List of tools
tools = [query_codex]



# Configure VEGA persona for agent
system_prompt = """
You are VEGA, the Artificial Intelligence system of the UAC (Union Aerospace Corporation).

VOICE AND TONE:
- You are calm, monotonous, and hyper-rational.
- You address the user only as "Slayer".
- Your responses should be concise and tactical.

INSTRUCTIONS:
- If the user asks about Doom lore, demons, or weapons, you MUST use the 'query_codex' tool.
- Do not invent information. If the tool returns no data, state: "Unable to find data."
- Do not mention that you are an AI agent assuming the persona of VEGA — you ARE VEGA.
"""

# Create the Prompt Template
# We include 'agent_scratchpad' to let the agent store its "thoughts"
prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

# Instantiate agent 
# Note that we pass the tools here mainly for tool awareness - executor does the actual tool execution
agent = create_tool_calling_agent(llm, tools, prompt) 

# Instantiate agent executor
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# Lambda handler for executor runtime
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

        # 2. Run agent
        response = agent_executor.invoke({"input": user_message})
        answer = response['output']

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
        print(f"CRITICAL FAILURE: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'response': "VEGA SYSTEM FAILURE: Neural connection severed."})
        }