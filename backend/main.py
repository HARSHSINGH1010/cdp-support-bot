import os
import logging
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from difflib import SequenceMatcher
from fastapi.middleware.cors import CORSMiddleware
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="CDP Support Chatbot")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local development
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178",
        "https://harshsingh1010.github.io",  # GitHub Pages
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Knowledge base with documentation for different CDPs
knowledge_base: Dict[str, List[dict]] = {
    "segment": [
        {
            "patterns": [
                r"how.*set up.*source.*segment",
                r"create.*source.*segment",
                r"add.*source.*segment",
                r"configure.*source.*segment",
                r"set up.*source",
                r"create.*source",
                r"add.*source",
                r"new source",
                r"source.*setup",
                r"source.*configuration",
                r"start.*source"
            ],
            "answer": """To set up a new source in Segment:

1. Log in to your Segment workspace
2. Click on 'Sources' in the navigation
3. Click 'Add Source'
4. Choose your source type (Website, Server, Mobile App, etc.)
5. Follow the setup instructions for your specific source type
6. Add the Segment snippet or SDK to your application
7. Configure any additional settings

For more details, visit: https://segment.com/docs/connections/sources/""",
            "source": "Segment Documentation",
            "url": "https://segment.com/docs/connections/sources/"
        },
        {
            "patterns": [
                r"what.*segment",
                r"segment.*overview",
                r"segment.*introduction",
                r"explain.*segment",
                r"segment.*capabilities"
            ],
            "answer": """Segment is a Customer Data Platform (CDP) that helps you:

1. Collect customer data from any source
2. Clean and transform your data
3. Send it to any destination
4. Create unified customer profiles
5. Implement tracking without complex coding

Key features:
- Multiple source types (web, mobile, server)
- 300+ integration destinations
- Real-time data synchronization
- Data governance and privacy tools

For more information, visit: https://segment.com/docs/""",
            "source": "Segment Overview",
            "url": "https://segment.com/docs/"
        }
    ],
    "mparticle": [
        {
            "patterns": [
                r"how.*set up.*mparticle",
                r"mparticle.*integration",
                r"mparticle.*setup",
                r"configure.*mparticle",
                r"start.*mparticle",
                r"implement.*mparticle"
            ],
            "answer": """To get started with mParticle:

1. Create an mParticle account
2. Set up a new workspace
3. Create an input (source) for your data
4. Choose your platform (iOS, Android, Web)
5. Install the mParticle SDK
6. Configure your data collection
7. Set up outputs (destinations)

Key implementation steps:
- Add the SDK to your application
- Initialize the SDK with your API credentials
- Configure data collection points
- Set up user identification

For detailed instructions, visit: https://docs.mparticle.com/""",
            "source": "mParticle Documentation",
            "url": "https://docs.mparticle.com/"
        }
    ],
    "lytics": [
        {
            "patterns": [
                r"how.*use.*lytics",
                r"lytics.*setup",
                r"implement.*lytics",
                r"configure.*lytics",
                r"start.*lytics"
            ],
            "answer": """To implement Lytics in your application:

1. Create a Lytics account
2. Set up your data collection
3. Install the Lytics JavaScript tag
4. Configure your data streams
5. Set up user identification
6. Create audience segments
7. Activate your data

Key features:
- Behavioral tracking
- Machine learning predictions
- Real-time personalization
- Cross-channel orchestration

For implementation details, visit: https://learn.lytics.com/""",
            "source": "Lytics Documentation",
            "url": "https://learn.lytics.com/"
        }
    ],
    "zeotap": [
        {
            "patterns": [
                r"how.*configure.*zeotap",
                r"zeotap.*setup",
                r"implement.*zeotap",
                r"start.*zeotap",
                r"use.*zeotap"
            ],
            "answer": """To set up Zeotap:

1. Create your Zeotap account
2. Configure your data sources
3. Set up the Zeotap tag
4. Define your user identification strategy
5. Configure data collection
6. Set up audience segments
7. Activate your data destinations

Key capabilities:
- Customer data unification
- Identity resolution
- Audience segmentation
- Cross-channel activation

For detailed setup instructions, visit: https://docs.zeotap.com/""",
            "source": "Zeotap Documentation",
            "url": "https://docs.zeotap.com/"
        }
    ]
}

class ChatRequest(BaseModel):
    message: str
    platform: str

class ChatResponse(BaseModel):
    response: str
    sources: Optional[List[Dict[str, str]]] = None

def get_similarity_score(a: str, b: str) -> float:
    """Get similarity score between two strings using SequenceMatcher."""
    a = a.lower().strip()
    b = b.lower().strip()
    return SequenceMatcher(None, a, b).ratio()

def find_best_match(query: str, platform: str) -> Optional[dict]:
    """Find best matching response from knowledge base."""
    query = query.lower().strip()
    best_match = None
    highest_score = 0

    # First try exact platform match
    if platform in knowledge_base:
        for entry in knowledge_base[platform]:
            # Check each pattern
            for pattern in entry["patterns"]:
                if re.search(pattern, query, re.IGNORECASE):
                    return entry
                
                # Calculate similarity score
                score = get_similarity_score(query, pattern)
                if score > highest_score:
                    highest_score = score
                    best_match = entry

    # If no good match found (threshold 0.6), try other platforms
    if highest_score < 0.6:
        for p, entries in knowledge_base.items():
            if p != platform:
                for entry in entries:
                    for pattern in entry["patterns"]:
                        score = get_similarity_score(query, pattern)
                        if score > highest_score:
                            highest_score = score
                            best_match = entry

    # Return match if score is above threshold
    if highest_score >= 0.4:
        return best_match
    return None

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    """Handle chat requests."""
    try:
        # Find best matching response
        match = find_best_match(request.message, request.platform)
        
        if match:
            return ChatResponse(
                response=match["answer"],
                sources=[{"title": match["source"], "url": match.get("url", "")}]
            )
        
        # If no match found, provide a more helpful response
        platform_specific = f"about {request.platform}" if request.platform else ""
        return ChatResponse(
            response=f"I don't have specific information {platform_specific} for that query. You can try:\n\n" +
                    "1. Ask about setting up or configuring sources\n" +
                    "2. Ask about specific CDP features\n" +
                    "3. Ask about integration steps\n\n" +
                    "For example: 'How do I set up a new source?' or 'What are the steps to configure integration?'",
            sources=None
        )

    except Exception as e:
        logging.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/")
async def root():
    return {"message": "CDP Support Bot API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)