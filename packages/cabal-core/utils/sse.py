import json
from enum import StrEnum, auto
from typing import Optional, Union, Dict, Any


class SSEEventType(StrEnum):
    """
    A Server-Sent Event (SSE) enum which clients can use to identify
    the *type* of payload they are receiving.
    """
    MESSAGE = auto()    # Standard chat message event
    TOOL = auto()       # Tool invocation update event
    ERROR = auto()      # Error message event
    DONE = auto()       # Stream completion event


def format_sse(
    data: Dict[str, Any], 
    event: Optional[SSEEventType] = None,
    id: Optional[str] = None,
) -> str:
    """
    Converts a data payload into a server-sent event (SSE).

    See https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#fields
    
    Args:
        data: The data to send in the form of a dictionary.
        event: An optional event type (see SSEEventType).
        id: An optional event ID for clients to track the last sent SSE.

    Returns:
        Formatted SSE string ready to be yielded.
    """
    lines = []
    
    # Start the SSE with an event type, if available
    if event:
        lines.append(f'event: {event.value}')

    # Format the data as JSON 
    # We use ensure_ascii=False to preserve Unicode characters
    json_data = json.dumps(data, ensure_ascii=False)
    lines.append(f'data: {json_data}')

    # Add event ID to the SSE, if available
    if id:
        lines.append(f'id: {id}')
    
    # Mark the event of this SSE with a double newline
    return '\n'.join(lines) + '\n\n'
