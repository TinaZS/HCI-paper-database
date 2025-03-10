import json

#Replace with Select Paper to display on home page
data = {"results":[{"abstract":"Recent work has highlighted the risks of LLM-generated content for a wide\nrange of harmful behaviors, including incorrect and harmful code. In this work,\nwe extend this by studying whether LLM-generated web design contains dark\npatterns. This work evaluated designs of ecommerce web components generated by\nfour popular LLMs: Claude, GPT, Gemini, and Llama. We tested 13 commonly used\necommerce components (e.g., search, product reviews) and used them as prompts\nto generate a total of 312 components across all models. Over one-third of\ngenerated components contain at least one dark pattern. The majority of dark\npattern strategies involve hiding crucial information, limiting users' actions,\nand manipulating them into making decisions through a sense of urgency. Dark\npatterns are also more frequently produced in components that are related to\ncompany interests. These findings highlight the need for interventions to\nprevent dark patterns during front-end code generation with LLMs and emphasize\nthe importance of expanding ethical design education to a broader audience.","authors":["Ziwei Chen","Jiawen Shen","Luna","Kristen Vaccaro"],"categories":["cs.HC","cs.AI","cs.LG"],"datePublished":"2025-02-19T07:35:07Z","link":"http://arxiv.org/abs/2502.13499v1","paper_id":"2e6864fe-04ec-4757-801d-3501dd85a7b0","similarity_score":0.56,"title":"Hidden Darkness in LLM-Generated Designs: Exploring Dark Patterns in\n  Ecommerce Web Components Generated by LLMs"},{"abstract":"Design assistants are frameworks, tools or applications intended to\nfacilitate both the creative and technical facets of design processes. Large\nlanguage models (LLMs) are AI systems engineered to analyze and produce text\nresembling human language, leveraging extensive datasets. This study introduces\na framework wherein LLMs are employed as Design Assistants, focusing on three\nkey modalities within the Design Process: Idea Exploration, Dialogue with\nDesigners, and Design Evaluation. Importantly, our framework is not confined to\na singular design process but is adaptable across various processes.","authors":["Swaroop Panda"],"categories":["cs.HC","cs.CY"],"datePublished":"2025-02-11T16:51:11Z","link":"http://arxiv.org/abs/2502.07698v1","paper_id":"dcd86b3a-5314-4441-a287-84d9f72e1084","similarity_score":0.53,"title":"A Framework for LLM-powered Design Assistants"},{"abstract":"Which large language model (LLM) is better? Every evaluation tells a story,\nbut what do users really think about current LLMs? This paper presents CLUE, an\nLLM-powered interviewer that conducts in-the-moment user experience interviews,\nright after users interacted with LLMs, and automatically gathers insights\nabout user opinions from massive interview logs. We conduct a study with\nthousands of users to understand user opinions on mainstream LLMs, recruiting\nusers to first chat with a target LLM and then interviewed by CLUE. Our\nexperiments demonstrate that CLUE captures interesting user opinions, for\nexample, the bipolar views on the displayed reasoning process of DeepSeek-R1\nand demands for information freshness and multi-modality. Our collected\nchat-and-interview logs will be released.","authors":["Mengqiao Liu","Tevin Wang","Cassandra A. Cohen","Sarah Li","Chenyan Xiong"],"categories":["cs.CL","cs.AI","cs.HC"],"datePublished":"2025-02-21T05:42:22Z","link":"http://arxiv.org/abs/2502.15226v1","paper_id":"2b6375d4-a628-4519-ba54-ae95f289a2fa","similarity_score":0.53,"title":"Understand User Opinions of Large Language Models via LLM-Powered\n  In-the-Moment User Experience Interviews"},{"abstract":"While large language models (LLMs) are increasingly used to assist users in\nvarious tasks through natural language interactions, these interactions often\nfall short due to LLMs' limited ability to infer contextual nuances and user\nintentions, unlike humans. To address this challenge, we draw inspiration from\nthe Gricean Maxims--human communication theory that suggests principles of\neffective communication--and aim to derive design insights for enhancing\nhuman-AI interactions (HAI). Through participatory design workshops with\ncommunication experts, designers, and end-users, we identified ways to apply\nthese maxims across the stages of the HAI cycle. Our findings include\nreinterpreted maxims tailored to human-LLM contexts and nine actionable design\nconsiderations categorized by interaction stage. These insights provide a\nconcrete framework for designing more cooperative and user-centered LLM-based\nsystems, bridging theoretical foundations in communication with practical\napplications in HAI.","authors":["Yoonsu Kim","Brandon Chin","Kihoon Son","Seoyoung Kim","Juho Kim"],"categories":["cs.HC"],"datePublished":"2025-03-02T11:38:22Z","link":"http://arxiv.org/abs/2503.00858v1","paper_id":"0a2a2caf-1e33-45f0-b47e-a92418cb98cc","similarity_score":0.51,"title":"Applying the Gricean Maxims to a Human-LLM Interaction Cycle: Design\n  Insights from a Participatory Approach"},{"abstract":"Large language models (LLMs) are increasingly used for both everyday and\nspecialized tasks. While HCI research focuses on domain-specific applications,\nlittle is known about how heavy users integrate LLMs into everyday\ndecision-making. Through qualitative interviews with heavy LLM users (n=7) who\nemploy these systems for both intuitive and analytical thinking tasks, our\nfindings show that participants use LLMs for social validation,\nself-regulation, and interpersonal guidance, seeking to build self-confidence\nand optimize cognitive resources. These users viewed LLMs either as rational,\nconsistent entities or average human decision-makers. Our findings suggest that\nheavy LLM users develop nuanced interaction patterns beyond simple delegation,\nhighlighting the need to reconsider how we study LLM integration in\ndecision-making processes.","authors":["Eunhye Kim","Kiroong Choe","Minju Yoo","Sadat Shams Chowdhury","Jinwook Seo"],"categories":["cs.HC"],"datePublished":"2025-02-21T11:46:04Z","link":"http://arxiv.org/abs/2502.15395v1","paper_id":"7588e711-088b-4103-bbeb-43edc6d11c92","similarity_score":0.51,"title":"Beyond Tools: Understanding How Heavy Users Integrate LLMs into Everyday\n  Tasks and Decision-Making"},{"abstract":"The emergence of Large Language Models (LLMs) has revolutionized\nConversational User Interfaces (CUIs), enabling more dynamic, context-aware,\nand human-like interactions across diverse domains, from social sciences to\nhealthcare. However, the rapid adoption of LLM-based personas raises critical\nethical and practical concerns, including bias, manipulation, and unforeseen\nsocial consequences. Unlike traditional CUIs, where personas are carefully\ndesigned with clear intent, LLM-based personas generate responses dynamically\nfrom vast datasets, making their behavior less predictable and harder to\ngovern. This workshop aims to bridge the gap between CUI and broader AI\ncommunities by fostering a cross-disciplinary dialogue on the responsible\ndesign and evaluation of LLM-based personas. Bringing together researchers,\ndesigners, and practitioners, we will explore best practices, develop ethical\nguidelines, and promote frameworks that ensure transparency, inclusivity, and\nuser-centered interactions. By addressing these challenges collaboratively, we\nseek to shape the future of LLM-driven CUIs in ways that align with societal\nvalues and expectations.","authors":["Smit Desai","Mateusz Dubiel","Nima Zargham","Thomas Mildner","Laura Spillner"],"categories":["cs.HC","cs.AI","cs.LG"],"datePublished":"2025-02-27T20:46:54Z","link":"http://arxiv.org/abs/2502.20513v1","paper_id":"84b69de8-07af-4f40-8a19-21c1dc1623fa","similarity_score":0.51,"title":"Personas Evolved: Designing Ethical LLM-Based Conversational Agent\n  Personalities"}]}
formatted_data = []

for item in data["results"]:
    formatted_data.append({
        "title": item["title"],
        "abstract": item["abstract"],
        "datePublished": item["datePublished"].split("T")[0],  # Only keep date part
        "link": item["link"], 
        "paper_id": item["paper_id"], 
        "categories": item["categories"],
    })

print(json.dumps(formatted_data, indent=2))