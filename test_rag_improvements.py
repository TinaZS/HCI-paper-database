#!/usr/bin/env python3
"""
Test script to verify RAG chatbot improvements
"""

import requests
import json
import sys
import time

BASE_URL = "http://localhost:10000"

def test_rag_endpoint(query):
    """Test the RAG query endpoint"""
    try:
        response = requests.post(f"{BASE_URL}/rag_query", 
                                json={"query": query},
                                timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            return {
                "success": True,
                "answer": data.get("answer", "No answer returned"),
                "query": query
            }
        else:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}: {response.text}",
                "query": query
            }
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "error": f"Request failed: {str(e)}",
            "query": query
        }

def main():
    """Run test queries to verify RAG improvements"""
    
    # Test queries covering different scenarios
    test_queries = [
        "What are recent advances in accessibility for mobile interfaces?",
        "How do users interact with voice assistants?", 
        "What research has been done on gesture recognition?",
        "Tell me about augmented reality in education",
        "What is quantum computing?",  # Likely to have no results
        "machine learning visualization"
    ]
    
    print("🧪 Testing RAG Chatbot Improvements")
    print("=" * 50)
    
    # Check if server is running
    try:
        health_check = requests.get(f"{BASE_URL}/", timeout=5)
    except:
        print("❌ Backend server not running. Please start with: python backend/server.py")
        sys.exit(1)
    
    results = []
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n🔍 Test {i}/{len(test_queries)}: {query}")
        print("-" * 40)
        
        result = test_rag_endpoint(query)
        results.append(result)
        
        if result["success"]:
            answer = result["answer"]
            print(f"✅ SUCCESS")
            print(f"Answer length: {len(answer)} chars")
            
            # Check for improved behavior
            if "no relevant papers" in answer.lower():
                print("📝 Note: No papers found - fallback message used")
            elif "provided papers do not contain" in answer.lower():
                print("📝 Note: LLM indicates insufficient information") 
            elif "**[" in answer:
                print("📝 Note: Citations detected in response")
            else:
                print("📝 Note: Answer provided without explicit citations")
                
            # Show first 200 chars of answer
            preview = answer[:200] + "..." if len(answer) > 200 else answer
            print(f"Preview: {preview}")
            
        else:
            print(f"❌ FAILED: {result['error']}")
        
        # Small delay between requests
        time.sleep(1)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary")
    print("=" * 50)
    
    successful = sum(1 for r in results if r["success"])
    failed = len(results) - successful
    
    print(f"✅ Successful queries: {successful}/{len(results)}")
    print(f"❌ Failed queries: {failed}/{len(results)}")
    
    if failed > 0:
        print("\nFailed queries:")
        for result in results:
            if not result["success"]:
                print(f"  - {result['query']}: {result['error']}")

if __name__ == "__main__":
    main()