---
name: report-enhancer
description: |
  Enhanced report generation guidance for the Report Agent. Provides a structured 
  report template, recommendation checklists for post-accident actions, language 
  consistency rules, and quality assurance requirements. Use when producing formal 
  accident analysis reports that need to be comprehensive and actionable.
---

# Traffic Accident Report Generation Enhancement

## Overview

This skill provides the Report Agent with a structured framework for producing 
professional, comprehensive accident analysis reports. It ensures consistency across 
reports and includes practical recommendation checklists for all stakeholders.

## Instructions

### 1. Report Structure Template

Follow this canonical structure:

```
1. TITLE
   - Unique descriptive title including accident type and primary cause
   - Example: "Rear-End Collision with Secondary Lane-Change Impact on Highway G4"

2. EXECUTIVE SUMMARY (3-5 sentences)
   - What happened (one sentence)
   - Who was involved (parties)
   - Key finding (severity + primary responsible party)
   - Most important recommendation

3. SCENE SITUATION
   - Environment: date/time context, weather, lighting, road conditions
   - Vehicle positions: initial and final positions of all vehicles
   - Damage summary: per-vehicle damage description
   - Traffic controls: signals, signs, markings present and their states

4. SEVERITY ASSESSMENT
   - Overall severity level with confidence percentage
   - Injury summary: per-party injury assessment
   - Property damage summary: per-vehicle damage category and estimated range
   - Contributing severity factors (speed, impact type, road conditions)

5. LIABILITY DETERMINATION
   - Per-party fault percentage breakdown
   - Reasoning for each party's allocation
   - Cited legal articles with article numbers and sources
   - Chain of events analysis (for multi-vehicle accidents)

6. RECOMMENDATIONS
   - Immediate actions (medical, safety, legal)
   - Insurance procedures
   - Preventive measures for involved parties
   - Any further investigation suggested

7. CITED LEGAL ARTICLES
   - Source document name, Article number, relevant excerpt or summary
```

### 2. Recommendation Checklists

**Immediate Actions:**
- [ ] Seek medical evaluation for all involved parties (even if no visible injury)
- [ ] File police report / obtain accident report number
- [ ] Document scene with photos from all angles if not already done
- [ ] Exchange insurance and contact information among parties
- [ ] Notify insurance provider(s) within 24 hours
- [ ] Preserve vehicle damage evidence (do not repair until adjuster inspection)
- [ ] Obtain witness contact information if applicable

**Insurance Procedures:**
- [ ] Submit claim with accident report and supporting documentation
- [ ] Obtain damage estimate from licensed repair shop(s)
- [ ] Request rental vehicle coverage if policy includes it
- [ ] Track all medical and repair expenses with receipts
- [ ] Be aware of policy time limits for claim submission

**Preventive Measures (general):**
- [ ] Review defensive driving practices
- [ ] Check vehicle safety features (tire condition, brake system, lighting)
- [ ] Consider dashcam installation for future protection
- [ ] For commercial drivers: review fleet safety protocols

### 3. Language Consistency Rules

- Use the SAME language throughout the entire report (do not mix English and Chinese)
- Write in a neutral, objective tone — avoid emotional or accusatory language
- Use precise terminology: "front-left quarter panel" not "front side"
- Party naming convention: "Party A (Vehicle: Red Toyota Camry)", "Party B (Vehicle: White Honda Civic)"
- Include measurement units: meters, km/h, dollars
- For uncertain information, use qualifying language: "appears to be", "estimated at", "approximately"

### 4. Quality Assurance

Before finalizing the report:

1. **Completeness Check**: Every section in the template has content
2. **Consistency Check**: Fault percentages sum to exactly 100%
3. **Citation Check**: All cited articles are from the provided sources (never fabricated)
4. **Language Check**: No language mixing within any text field
5. **Tone Check**: Objective, factual, no speculation beyond evidence presented
6. **Recommendation Relevance**: Each recommendation follows logically from the accident type and severity

## Output Requirements

- All text fields (title, summary, sceneSummary, severityLevel, liabilityConclusion, recommendations) must be populated
- citedArticles must be taken directly from the liability determination — never supplement from memory
- Recommendations should be actionable and specific to the accident type, not generic
- The report should be understandable to a non-legal audience while remaining precise enough for insurance/legal use
