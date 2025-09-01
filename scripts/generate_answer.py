from langchain.schema import SystemMessage, HumanMessage, AIMessage
import sys
import os

# Allow import from src/llm_client.py
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

from llm_client import llm  # ✅ import your AzureChatOpenAI object

def generate_answer_from_papers(query, papers):
    context = "\n\n".join([
        f"Title: {p['title']}\nAbstract: {p['abstract']}"
        for p in papers if p.get("abstract")
    ])

    # Few-shot example (optional but very helpful)
    few_shot_user = HumanMessage(content=(
        "User: What are some recent papers on accessibility for elderly users?\n\n"
        "Papers:\n"
        "Title: Designing for Aging Populations: Challenges and Opportunities\n"
        "Abstract: This paper explores challenges elderly users face when interacting with digital interfaces. "
        "It proposes design guidelines including larger font sizes, simplified navigation, and voice-based interaction.\n\n"
        "Title: Screen Readers and Older Adults\n"
        "Abstract: This work analyzes the usability of screen readers among older adults. It highlights the need for training, "
        "simpler auditory feedback, and personalized settings."
    ))

    few_shot_bot = AIMessage(content=(
        "Several papers explore this topic:\n\n"
        "• **Designing for Aging Populations: Challenges and Opportunities** discusses how to improve digital interfaces "
        "for elderly users through simplified navigation and voice interaction.\n\n"
        "• **Screen Readers and Older Adults** emphasizes the usability challenges of screen readers for elderly users, "
        "recommending simpler auditory feedback and customization.\n\n"
        "These works highlight the growing interest in accessibility-focused HCI research."
    ))

    system_prompt = SystemMessage(content=(
    "You are a helpful research assistant that explains academic concepts using papers from our database. "
    "Your goal is to be educational, conversational, and insightful.\n\n"
    "IMPORTANT: You can ONLY cite papers that are provided in the 'Papers:' section below. "
    "Do NOT cite any papers from your general knowledge or training data.\n\n"
    "RESPONSE STYLE:\n"
    "- Start with a clear, conversational explanation of the topic\n"
    "- Synthesize key insights and trends from the research\n" 
    "- Use natural, educational language (not just paper lists)\n"
    "- Highlight important findings and their implications\n\n"
    "CITATION RULES:\n"
    "- ONLY cite papers from the provided 'Papers:' section\n"
    "- Use the EXACT title as written in the 'Title:' field\n"
    "- Format as: **Exact Title From Papers Section**\n"
    "- If no relevant papers are provided, say so instead of citing external papers\n\n"
    "STRUCTURE: Brief explanation → Key insights → Supporting papers with context"
))


    user_prompt = HumanMessage(content=(
        f"Papers:\n{context}\n\n"
        f"User's question: {query}"
    ))

    response = llm([
        system_prompt,
        few_shot_user,
        few_shot_bot,
        user_prompt
    ])

    # Validate that cited papers are actually from the search results
    answer_content = response.content
    provided_titles = [p['title'] for p in papers if p.get('title')]
    
    import re
    # Find all **Title** citations in the response
    cited_titles = re.findall(r'\*\*([^*]+)\*\*', answer_content)
    
    # Check citations and separate valid from invalid
    valid_citations = []
    invalid_citations = []
    
    for cited_title in cited_titles:
        cited_clean = cited_title.strip()
        # Skip very short items (likely not paper titles)
        if len(cited_clean) < 15:
            continue
            
        # Check if this citation matches any provided paper
        found_match = False
        for actual_title in provided_titles:
            # Clean up the actual title - remove newlines and extra spaces
            actual_clean = ' '.join(actual_title.replace('\n', ' ').split())
            cited_lower = cited_clean.lower()
            actual_lower = actual_clean.lower()
            
            # Check for exact match or substantial overlap (must be significant overlap)
            if cited_lower == actual_lower or (len(cited_clean) > 30 and cited_lower in actual_lower) or (len(actual_clean) > 30 and actual_lower in cited_lower):
                found_match = True
                valid_citations.append(cited_clean)
                break
                
        if not found_match:
            invalid_citations.append(cited_clean)
    
    # Only block if we have NO valid citations and multiple invalid ones
    # This allows responses with section headings as long as there are also real paper citations
    if len(valid_citations) == 0 and len(invalid_citations) > 2:
        return (f"Based on the research papers in our database, I can provide insights on this topic. "
                f"The analysis draws from {len(provided_titles)} relevant papers from our collection. "
                "However, to ensure accuracy, I recommend using the main search interface for specific paper citations.")
    
    return answer_content
