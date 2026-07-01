# SmartTrans User Guide

> Using traffic accident analysis as a scenario, this guide walks you through four core leaps in AI agent capability: from **being able to talk**, to **having knowledge**, to **getting things done** — and finally, to **evolving without rewriting code**.

---

## Table of Contents

- [Phase 1: Prompts & Multi-Agent Collaboration](#phase-1-prompts--multi-agent-collaboration)
- [Phase 2: RAG Knowledge Enhancement](#phase-2-rag-knowledge-enhancement)
- [Phase 3: Tool Calling & MCP](#phase-3-tool-calling--mcp)
- [Phase 4: Skills — Reusable Agent Capabilities](#phase-4-skills--reusable-agent-capabilities)
- [Key Concepts at a Glance](#key-concepts-at-a-glance)

---

## Phase 1: Prompts & Multi-Agent Collaboration

**The core question**: How do you make an AI go from "chatting" to "being professional"?

### 1.1 Walkthrough

1. Open the system in your browser (contact the instructor for the URL).
2. Confirm you are on the **「Accident Analysis」** tab.
3. In the left panel **「Case Information」** area:
   - Click `+` to upload traffic accident scene images (multiple images supported).
   - Fill in the **Text Description** field with an accident narrative, for example:
     > At 3:00 PM on June 15, 2024, at a major urban intersection, Vehicle A traveling straight collided with Vehicle B making a left turn. Weather was clear, road surface was dry.
   - Click the **「Start Analysis」** button.
4. Watch the pipeline execute in the right panel and wait for the report to generate.

> 💡 The language switcher in the top-right corner lets you choose English, Simplified Chinese, or Traditional Chinese. The entire pipeline — from system prompts to the final report — will operate in your selected language.

![Analysis page screenshot](./images/image-20260626122908535.png)

### 1.2 What Happened

The system decomposes a complex analysis task into a relay of four **specialized agents**:

| Stage | Agent | Responsibility |
|-------|-------|----------------|
| ① | Vision Agent | Understand the visual information of the accident scene — vehicles, road conditions, environment |
| ② | Severity Agent | Assess the accident severity level and evaluate personal injury and property damage risks |
| ③ | Liability Agent | Determine fault percentages for each party and cite legal references |
| ④ | Report Agent | Synthesize the distributed analyses into a complete decision-support report |

The status indicator in the top-right corner of each stage updates in real time — `Waiting` → `Analyzing` → `Complete`. This is not magic; it is a **pipeline architecture** at work: the output of one stage is the input to the next.

### 1.3 Why Prompts Matter

Each agent plays a professional role because of a carefully designed **prompt** — in essence, it defines the AI's "professional identity."

Consider the same accident photo shown to different observers:
- Ask a traffic officer to "describe the scene" → they focus on liability-relevant details.
- Ask an insurance adjuster to "describe the scene" → they focus on loss-relevant details.
- Ask a bystander to "describe the scene" → they might only see "two cars crashed."

The value of a prompt is not in "making the AI speak," but in **making the AI say the right thing**. It transforms a general-purpose model into a domain expert — without retraining the model, only redefining the role.

> **Core insight**: A prompt is a "professional contract" between a human and an AI. It does not change the model's capability boundary, but it determines which path the model takes within that boundary.

### 1.4 Why Multi-Agent

When facing a complex task, the intuitive approach is to "let one AI handle everything." In practice, this often leads to **attention dilution** — the model switches between vision, assessment, and legal reasoning, struggling to go deep on any single dimension.

The multi-agent architecture is fundamentally about **cognitive division of labor**:

- Each agent bears a single responsibility, allowing the prompt to be extremely focused.
- Stages communicate through **structured output** — not "a paragraph of text," but precise fields (severity level, fault percentage, article number).
- Deviations in any single stage can be localized and corrected without contaminating the entire pipeline.

> **Core insight**: Multi-agent is not about "making more AIs work" — it is about "letting each AI do one thing well." This follows the same logic as professional specialization in organizational management.

### 1.5 On Structured Output

Worth special attention: every agent's output is not free-form text, but a **rigorously constrained data structure**.

This may seem like a technical detail, but it is the threshold where AI crosses from "conversation tool" into "business system." Free-form text can be read, but it cannot be reliably consumed by the next stage; structured data can be validated, transmitted, aggregated, and audited. It is the **dependable interface** between agents, and the foundation on which the entire pipeline runs autonomously.

![Structured output screenshot](./images/image-20260626123015625.png)

---

## Phase 2: RAG Knowledge Enhancement

**The core question**: Where does an AI's knowledge come from? What gives it the authority to say "according to relevant laws and regulations"?

### 2.1 Walkthrough

1. Switch to the **「Knowledge Base」** tab.
2. Upload traffic regulation documents:
   - Click the **「Add Document」** button.
   - Drag and drop or select a `.md` or `.txt` file (for example, excerpts from the Road Traffic Safety Law).
   - Click **「Upload」** and wait for processing to complete.

![Knowledge base upload screenshot](./images/image-20260626123051052.png)

3. Try **semantic search**:
   - Enter `rear-end collision liability determination` and click **「Search」**.
   - Observe the **distance scores** in the returned results — they measure how semantically close each result is to your query.

4. Return to the **「Accident Analysis」** page, re-run the analysis, and compare the Liability stage output — before and after having a knowledge base.

![Semantic search screenshot](./images/image-20260626123038340.png)

### 2.2 What Happened

Without a knowledge base, the Liability Agent can only say "according to relevant laws and regulations…" — vague, unverifiable, untraceable.

With a knowledge base, it concretely lists:

- Which article of which law is being cited.
- The verbatim text of that article.
- How that article relates to the present case.

![Liability result screenshot 1](./images/image-20260626123126321.png)

![Liability result screenshot 2](./images/image-20260626123139755.png)

Moving from "it's probably something like that" to "it is indeed this article" — this is a qualitative leap.

### 2.3 The Essence of RAG: Giving the AI a Bookshelf

The core idea of **RAG (Retrieval-Augmented Generation)** is simple yet profound: **rather than making the AI memorize everything, give it a bookshelf and let it look things up when needed.**

A traditional AI's knowledge comes from its training data — what it "remembers." This creates three unavoidable problems:

| Problem | Nature | RAG's Solution |
|---------|--------|----------------|
| Knowledge cutoff | The world keeps changing after training completes | Documents can be updated anytime; the AI always references the latest version |
| Hallucination risk | When "uncertain," models "fabricate" — and fabricate plausibly | The AI is constrained to cite only real, retrieved documents |
| Domain depth | General-purpose models are inevitably "breadth-first" on specialized domains | Specialist documents build a deep moat of professional knowledge |

> **Core insight**: RAG does not solve "the AI isn't smart enough." It solves "the AI should not make professional judgments from memory." This is the same reason a doctor should not prescribe from memory — they should consult the latest pharmacopoeia.

### 2.4 From Documents to Knowledge: Chunking and Vectorization

Uploaded documents are not fed to the AI verbatim. The system does two things worth understanding:

**First, chunking.** The system automatically detects **「Article X」** markers and splits legal texts by article into independent knowledge units. This is not because the AI cannot read long texts, but because **precise retrieval requires precise granularity** — when you ask about "rear-end liability," the system should return the few articles about rear-end collisions, not the entire statute.

**Second, vectorization.** Each knowledge unit is converted into a high-dimensional mathematical vector. This is not for "encryption" or "compression," but to **make semantics computable**. "Rear-end collision" and "the vehicle behind strikes the rear of the vehicle ahead" are entirely different at the character level, yet extremely close in vector space — because vectors capture *meaning*, not *spelling*.

> **Core insight**: The significance of vectorization is that it turns "understanding meaning" — a uniquely human capability — into a mathematically measurable, sortable, and optimizable computational problem.

---

## Phase 3: Tool Calling & MCP

**The core question**: Can an AI do more than just "talk" — can it actually "act"?

### 3.1 Prerequisites

The MCP feature must be enabled on the server side. If the **「MCP Settings」** tab is not visible in the navigation bar, contact the administrator to confirm the server configuration (`MCP_ENABLED=true`).

### 3.2 Understanding Preset Tools

1. Switch to the **「MCP Settings」** tab.
2. You will see a connection marked with a <el-tag size="small" type="info">System</el-tag> badge: **「PDF Report Generator」**.
   - It is a system preset and cannot be deleted.
   - It provides one capability: generating a formal PDF document from the analysis report.

![MCP settings screenshot](./images/image-20260626123158034.png)

### 3.3 Enabling Tools for Agents

1. Switch to the **「Accident Analysis」** tab.
2. In the pipeline panel on the right, locate the gear icon ⚙️ next to the **Report Agent** title (only visible when MCP is enabled).
3. Click it to open the **Agent Settings** dialog — a unified panel with two tabs:
   - **「MCP Tools」** tab: toggle which MCP tools are enabled for this agent.
   - **「Skills」** tab: toggle which skills are active for this agent (covered in Phase 4).
4. Under the MCP Tools tab, find **「PDF Report Generator」** and turn the switch on.
5. Close the dialog.

![MCP tool configuration screenshot](./images/image-20260626123215838.png)

### 3.4 Running Analysis with Tools

1. Upload images and description, then click **「Start Analysis」**.
2. After the analysis completes, switch to the **「History」** tab.
3. Locate your report — you will see a **「Download PDF」** button.
4. Click to download a formatted, official report document.

![History report screenshot](./images/image-20260626123242183.png)

### 3.5 The Essence of Tool Calling: From "Advisor" to "Executor"

In the previous two phases, the AI demonstrated **cognitive ability** — understanding images, assessing risk, retrieving legal references. But cognition typically ends with "producing a paragraph of text." Business value, however, usually requires **action** after the paragraph: generating a file, sending a notification, updating a database.

**Tool Calling** enables the AI to cross this line:

```
Understand the need → autonomously decide which tool to call → pass parameters → receive results → continue reasoning based on results
```

The key is not that "the AI can call a function," but that **the AI itself judges when to call, which tool to call, and how to interpret the result**. This is not a pre-scripted workflow; it is the agent making autonomous decisions at runtime.

> **Core insight**: Without tool-calling capability, an AI is a "consultant" — it can only tell you what you should do. With tool-calling capability, the AI becomes an "executor" — it can go and do it directly. For enterprises, this means AI crosses from "decision support" into "execution replacement."

### 3.6 MCP: A Universal Language for Tools

Suppose an enterprise has 10 internal systems and 50 external APIs, each requiring separate adaptation for AI — this is not a technical problem; it is a **scaling problem**.

**MCP (Model Context Protocol)** solves precisely this scaling problem. It defines a standard where:

- Whether a tool is a local script, a remote service, or a cloud API, **the integration method is unified**.
- Regardless of what a tool does, the way the AI discovers, understands, and invokes it is **unified**.
- No matter how many new tools are added in the future, **the extension pattern is unified**.

By analogy: MCP is to the AI tool ecosystem what USB is to the computer peripheral ecosystem. Before USB, every peripheral needed a proprietary port; after USB, one interface connects everything.

### 3.7 System Connections vs. User Connections

In MCP Settings, connections fall into two categories:

| Type | Characteristics | Management |
|------|----------------|-------------|
| **System Connections** | Preset, non-deletable; represent platform-native capabilities | Maintained and upgraded by the platform |
| **User Connections** | Added by users; represent on-demand external capabilities | Users manage their own lifecycle |

This design reflects an organizational principle: **the platform provides a stable foundation; users inject domain-specific expertise**. System connections define the "out-of-the-box" capability baseline; user connections allow each organization to connect the AI to their own data sources and services, growing the AI's capability map with business needs.

Use the **「Add MCP Server」** button to connect external MCP services — mapping services, weather data, industry databases — letting the AI's capabilities grow organically with your requirements.

---

## Phase 4: Skills — Reusable Agent Capabilities

**The core question**: Can we upgrade an AI agent's capabilities without touching a single line of code?

### 4.1 Walkthrough

1. Switch to the **「Skills」** tab in the navigation bar.
2. Observe the pre-installed system skill:
   - **`liability-enhancer`** — marked with a <el-tag size="small" type="info">System</el-tag> badge, non-deletable.
   - Its description explains what it does: enhanced guidance for traffic accident liability determination.
3. Create a custom skill:
   - Click the **「New Skill」** button.
   - In the dialog, paste a SKILL.md document — this is a text file with YAML frontmatter followed by Markdown instructions. For example:

   ```markdown
   ---
   name: severity-checklist
   description: |
     A structured checklist for comprehensive severity assessment,
     covering vehicle damage grades, injury classification,
     and environmental hazard evaluation.
   ---

   # Severity Assessment Checklist

   ## Instructions

   When assessing accident severity, systematically evaluate:

   ### 1. Vehicle Damage
   - Level A: Cosmetic damage only (scratches, dents)
   - Level B: Functional damage (lights, mirrors, windows)
   - Level C: Structural damage (frame, axles, crumple zones)
   - Level D: Total loss

   ### 2. Injury Classification
   - Minor: Bruises, whiplash — outpatient treatment
   - Moderate: Fractures, lacerations requiring sutures — hospitalization < 7 days
   - Severe: Life-threatening, permanent disability — hospitalization ≥ 7 days
   - Fatal: One or more fatalities

   ### 3. Environmental Hazards
   - Fluid spills (fuel, oil, coolant)
   - Road blockage (partial or full lane closure)
   - Secondary collision risk (blind curves, high-speed traffic)
   ```

   - Click **「Create」** to save.

4. Bind the skill to an agent:
   - Switch to **「Accident Analysis」**.
   - Click the gear icon ⚙️ on the **Severity Agent** to open the Agent Settings dialog.
   - Switch to the **「Skills」** tab.
   - Toggle **`severity-checklist`** on for the Severity agent.
   - Close the dialog.

5. Run an analysis and observe:
   - During pipeline execution, the Severity Agent step displays a yellow <el-tag type="warning">severity-checklist</el-tag> tag, indicating the skill is active.
   - The Severity assessment in the final report should reflect the structured checklist approach — more systematic, with explicit damage grades and injury classifications.

### 4.2 What Happened

A **Skill** is a reusable capability package, stored as a `SKILL.md` file under `server/data/skills/<skill-name>/`. Each skill consists of:

- **YAML frontmatter**: metadata — `name` (unique identifier) and `description` (what the skill does).
- **Markdown body**: the actual instructions injected into the agent's system prompt.

When the server starts, the `SkillsManager` parses all SKILL.md files from disk and caches them in memory. When a pipeline analysis is launched:

1. The orchestrator queries `SkillsManager.getSkillsForAgent(agentName)` for each agent.
2. This merges persisted agent-skill bindings (from the `agent_skill_settings` database table) with any per-session selections from the request.
3. The resulting skill list is passed to `formatSkillForSystemPrompt()`, which wraps each skill's instructions in clear boundary markers:

```
--- BEGIN SKILLS ---
[Skill: severity-checklist]
Description: A structured checklist for comprehensive severity assessment...
Instructions:
# Severity Assessment Checklist
...
[/Skill: severity-checklist]
--- END SKILLS ---
```

4. This text block is appended to the agent's system prompt before the LLM call — the model reads it as extended domain expertise.

### 4.3 The Essence of Skills: Evolve Without Rewriting Code

We now have four mechanisms for shaping AI agent behavior. Their relationship is worth understanding:

| Mechanism | Metaphor | What It Does |
|-----------|----------|--------------|
| **Prompt** | Job description | Defines the agent's professional role — *what kind of expert it is* |
| **RAG** | Reference bookshelf | Gives the agent retrievable knowledge — *what facts it can look up* |
| **MCP / Tools** | Hands and tools | Gives the agent the ability to act — *what it can do in the world* |
| **Skills** | Training manual | Gives the agent reusable expertise modules — *how it should think and operate* |

Skills occupy a unique position in this landscape. They are neither reference data (RAG) nor executable functions (MCP) — they are **operational know-how**. The preset `liability-enhancer` doesn't add new law articles; it adds fault-determination heuristics, common accident pattern tables, and multi-vehicle chain analysis methods — the kind of tacit knowledge an experienced adjuster develops over years.

The architectural significance of Skills is this: **they decouple capability upgrades from code changes**. A domain expert — a senior claims adjuster, a legal specialist, a medical reviewer — can author a SKILL.md file and have it injected into the relevant agent's reasoning process. No code deployment, no model retraining, no pipeline reconfiguration. The skill can be enabled, disabled, or updated independently, per agent, per session.

> **Core insight**: Prompts define *what the agent is*. RAG provides *what the agent can reference*. MCP enables *what the agent can do*. Skills define *how the agent thinks* — and they make this "how" modular, swappable, and authorable by domain experts rather than engineers. This is the path from "building an AI system" to "operating an AI workforce."

### 4.4 The SKILL.md Format

Every skill follows a simple convention:

```markdown
---
name: <unique-identifier>
description: |
  <what this skill provides — used for discovery and selection>
---

# <Title>

## Instructions

<The actual guidance, heuristics, checklists, or methodologies
the agent should follow. Use standard Markdown — headings, tables,
lists — to structure the content clearly.>
```

The `name` field is the skill's unique identifier. The `description` appears in the UI to help users understand what the skill does. The body — everything after the second `---` — is the content injected into the agent's system prompt. Write it as if you are writing a training manual for a new employee: clear, structured, and actionable.

---

## Key Concepts at a Glance

| Concept | One-Line Understanding |
|---------|----------------------|
| Prompt | Defines the AI's "professional identity" — not making it speak, but making it say the right thing |
| Multi-Agent | Cognitive division of labor — complex tasks decomposed into manageable specialized stages |
| Structured Output | The "dependable interface" between agents — verifiable, transmittable, auditable |
| RAG | Give the AI a bookshelf — rather than memorizing everything, look it up when needed |
| Vector Embedding | Making semantics computable — turning "understanding meaning" into a mathematical problem |
| Tool Calling | The AI crosses from "advisor" to "executor" — not just saying, but doing |
| MCP | A universal language for tool integration — one interface, connecting everything |
| Skill | A reusable capability package — evolve AI expertise without changing code |
| Agent | An AI endowed with a role, knowledge, and tools — like a specialized digital employee |
