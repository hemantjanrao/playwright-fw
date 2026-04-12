# Autonomous QA Agent Architecture

*Prepared for the Osapiens Test Engineering Team*

## Executive Summary
This document outlines the advanced Retrieval-Augmented Generation (RAG) architecture integrated into the Playwright End-to-End testing framework. By bridging Jira sprint data with Large Language Models (LLMs) and local machine learning embeddings, the framework autonomously writes, structures, and correctly scopes Page Object Models and test specs with zero human intervention.

---

## 1. RAG-Based Page Object Retrieval

The core capability of the QA Agent is generating Playwright tests that adhere strictly to existing framework conventions. Instead of hallucinating arbitrary locators (e.g., `page.locator('.btn-primary')`), the Agent performs a "closed-loop" context search before generation.

### 1.1 Vector Ingestion (The Knowledge Base)
The repository uses a local machine learning pipeline to index the codebase without requiring external API keys.
* **Technology**: `@xenova/transformers` (running local CPU inference using the `Xenova/all-MiniLM-L6-v2` model).
* **Process**: The `ragIngestor.ts` script iterates across the `pages/` directory. It evaluates the semantic intent of every Page Object Model class, method, and variable, converting the TypeScript code into multidimensional coordinate vectors (Embeddings).
* **Storage**: These mathematical representations are stored lightweightly in a local `rag-db.json` file.

### 1.2 Context Injection (Cosine Retrieval)
When a user executes the generation command against a Jira ticket (e.g., `npm run test:generate -- SCRUM-5`), the Agent ensures code consistency through Cosine Similarity math.
1. The Agent connects to the Jira REST API to extract the Ticket Summary and Acceptance Criteria.
2. The Acceptance Criteria text is converted into an embedding.
3. The Agent sweeps the `rag-db.json` to find the closest mathematically matching Page Object.
4. **If a match is found (Score > 0.40):** The exact source code of that Page Object is secretly concatenated to the System Prompt. The LLM is strictly instructed: *"You MUST use the existing methods from the snippet below."*

---

## 2. Autonomous Page Object Generation (Fallback Automation)

In an Agile setting, SDETs are often tasked with writing tests for completely new features where Page Objects do not yet exist. The framework uses an Autonomous Override protocol to handle missing architecture.

### 2.1 Handling Missing Context
If the Vector Database search returns low similarity scores across the board (indicating the requested Jira feature does not map to any existing Page Object), the framework triggers **Autonomous Generation Mode**. 

### 2.2 XML Multi-File Output Structure
To instruct an LLM to generate multiple distinct files from a single shot, the Agent reconfigures the System Prompt using strict XML schemas.

The LLM (Claude 3.5 Sonnet) is instructed to output its intelligence wrapped cleanly in tags:
\`\`\`xml
<pom>
  <filename>LoginPage.ts</filename>
  <code> ... Class Implementation ... </code>
</pom>
<spec>
  <filename>scrum-5.test.ts</filename>
  <code> ... E2E Spec Implementation ... </code>
</spec>
\`\`\`

### 2.3 File System Synthesis
The generation script utilizes regular expressions to catch and split the XML payload. 
1. It parses the `<pom>` block and autonomously writes the new class to the `pages/` directory.
2. It parses the `<spec>` block, ensuring the newly generated test inherently imports the correct relative path of the newly written POM class.
3. Both files are committed to disk simultaneously, drastically reducing the boilerplate burden on the QA engineer.

---
*Architecture designed around Playwright, TypeScript, and Claude Sonnet capabilities.*
