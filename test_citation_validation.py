#!/usr/bin/env python3
"""
Test script to validate RAG citations and catch hallucinations
"""

import requests
import json
import re
import sys

BASE_URL = "http://localhost:10000"

def extract_citations(text):
    """Extract citations - look for both **[Title]** and **Title** formats"""
    cited_titles = []
    cited_titles.extend(re.findall(r'\*\*\[([^\]]+)\]\*\*', text))  # **[Title]**
    cited_titles.extend(re.findall(r'\*\*([^*]+)\*\*', text))       # **Title**
    
    # Filter to only titles that look like paper titles (long, have colons)
    return [title.strip() for title in cited_titles 
            if len(title.strip()) > 10 and ':' in title]

def test_citation_validation():
    """Test that all cited papers actually exist in retrieval"""
    
    test_queries = [
        "user interface design trends",
        "accessibility for mobile interfaces", 
        "augmented reality applications",
        "voice user interfaces",
        "machine learning in HCI"
    ]
    
    print("🧪 Testing Citation Validation")
    print("=" * 50)
    
    all_passed = True
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n🔍 Test {i}/{len(test_queries)}: '{query}'")
        print("-" * 40)
        
        try:
            # Get RAG response
            response = requests.post(f"{BASE_URL}/rag_query", 
                                    json={"query": query}, 
                                    timeout=30)
            
            if response.status_code != 200:
                print(f"❌ HTTP Error {response.status_code}: {response.text}")
                all_passed = False
                continue
                
            data = response.json()
            answer = data.get("answer", "")
            
            # Extract citations
            cited_titles = extract_citations(answer)
            
            if not cited_titles:
                print("⚠️  No citations found in response")
                print(f"Response preview: {answer[:200]}...")
                continue
                
            print(f"📋 Found {len(cited_titles)} citations:")
            
            # Get actual papers by doing search directly  
            search_response = requests.post(f"{BASE_URL}/search", 
                                          json={"query": query, "numPapers": 20})
            
            if search_response.status_code == 200:
                search_data = search_response.json()
                actual_papers = search_data.get("results", [])
                actual_titles = [p.get("title", "") for p in actual_papers if p.get("title")]
                
                print(f"🔍 Retrieved {len(actual_titles)} actual papers")
                
                # Validate each citation
                invalid_citations = []
                for cited_title in cited_titles:
                    print(f"  • **[{cited_title}]**")
                    
                    # Check if citation matches any actual paper title
                    found_match = False
                    for actual_title in actual_titles:
                        # Allow partial matches (case insensitive)
                        if (cited_title.lower() in actual_title.lower() or 
                            actual_title.lower() in cited_title.lower() or
                            # Check for substantial overlap (at least 3 words)
                            len(set(cited_title.lower().split()) & set(actual_title.lower().split())) >= 3):
                            found_match = True
                            break
                    
                    if not found_match:
                        invalid_citations.append(cited_title)
                        print(f"    ❌ NO MATCH FOUND")
                    else:
                        print(f"    ✅ Valid")
                
                if invalid_citations:
                    print(f"\n❌ HALLUCINATION DETECTED:")
                    print(f"Invalid citations: {len(invalid_citations)}")
                    for invalid in invalid_citations:
                        print(f"  - '{invalid}'")
                    print("\nActual paper titles available:")
                    for title in actual_titles[:5]:  # Show first 5
                        print(f"  - '{title}'")
                    all_passed = False
                else:
                    print(f"✅ All citations valid!")
                    
            else:
                print(f"⚠️  Could not verify against search results")
                
        except Exception as e:
            print(f"❌ Error: {e}")
            all_passed = False
    
    print("\n" + "=" * 50)
    print("📊 FINAL RESULT")
    print("=" * 50)
    
    if all_passed:
        print("✅ ALL TESTS PASSED - No hallucinations detected!")
        return True
    else:
        print("❌ TESTS FAILED - Citations contain hallucinations!")
        return False

if __name__ == "__main__":
    success = test_citation_validation()
    sys.exit(0 if success else 1)