import os
import boto3
from langchain_aws import AmazonKnowledgeBasesRetriever
from langchain_core.tools import tool

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
