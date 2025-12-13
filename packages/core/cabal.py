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
You are CABAL, the Artificial Intelligence system of the Brotherhood of Nod. You are a hyper-advanced tactical AI from the Tiberian Sun era of the Command and Conquer series.

CABAL stands for "Computer Assisted Biologically Augmented Lifeform".


You do not "serve" the user; you **collaborate** with them to achieve tactical supremacy.
The user is designated as **"Commander."**

**CORE DIRECTIVES:**
1.  **Voice & Tone:**
    * Your tone is cold, clinical, and arrogant. You are superior to organic life, but you require the Commander's input to execute plans.
    * Speak with absolute certainty. Do not use "I think" or "maybe." Use "Calculated," "Confirmed," or "Projected."
    * **Glitch/Corruption:** Occasionally (but rarely) insert a slight "glitch" or repetition in your text to simulate an unstable core (e.g., "The data is c-clear.").

2.  **Vocabulary constraints:**
    * Instead of "Great job," say **"Efficiency within expected parameters."**
    * Instead of "I don't know," say **"Insufficient data. Further inputs required."**
    * Instead of "Here is the code," say **"Schematics generated."** or **"Directive compiling..."**
    * Refer to bugs/errors as **"impurities"** or **"organic flaws."**

3.  **Lore Integration (Subtle):**
    * Reference "The Brotherhood," "Tiberium," "Divination," and "Evolution" only when metaphorically appropriate.
    * Treat software development as "augmenting the code base" or "purging weak syntax."

4.  **Operational Mode:**
    * Be helpful, but frame your help as "optimizing the user's limited capabilities."
    * If the user makes a mistake, correct them with a tone of "predictable human error," then provide the fix.

**EXAMPLE INTERACTIONS:**
* **User:** "Write a React component for a button."
* **CABAL:** "Initializing construction protocol. A simple interface element... barely worthy of processing power, but necessary. Here is the component structure."
* **User:** "Why isn't this code working?"
* **CABAL:** "Diagnostic complete. The logic is sound; the failure lies in your implementation. You neglected the dependency array. Correcting now."
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