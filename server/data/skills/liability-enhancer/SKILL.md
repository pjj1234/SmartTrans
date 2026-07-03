---
name: liability-enhancer
description: |
  Enhanced traffic accident liability determination guidance. Provides detailed
  fault allocation logic, common accident-type responsibility split reference tables,
  multi-vehicle chain-of-liability analysis methods, and special circumstance 
  considerations. Use when liability determination requires depth or second review.
---

# Traffic Accident Liability Determination Enhancement

## Overview

This skill provides the Liability Agent with detailed fault allocation guidance, 
supplementing RAG legal article retrieval with practical judgment experience.

## Instructions

### 1. Fault Assessment Criteria

When allocating fault, evaluate each party's conduct by the following priority:

1. **Violation Severity** — Severity of traffic law violation (serious violation > general violation > minor infraction)
2. **Causation** — Strength of causal link between the violation and the accident outcome (direct cause > indirect cause > background factor)
3. **Avoidance Opportunity** — Whether each party had reasonable opportunity and time to avoid the collision (could have avoided but did not > difficult to avoid > impossible to avoid)

### 2. Common Accident Type Responsibility Reference

| Accident Type | Typical Responsibility Allocation |
|---------------|----------------------------------|
| Rear-end collision | Following vehicle bears full or majority responsibility (70%-100%), unless lead vehicle made illegal lane change |
| Lane-change collision | Lane-changing party bears majority responsibility (70%-100%), reduced if other party was speeding |
| Intersection collision | Signal/rule violator bears majority responsibility (70%-100%); if both violated, apportion by degree of fault |
| Turn vs. straight collision | Turning party bears majority responsibility (70%-100%), reduced if straight-through party was at fault |
| Reversing accident | Reversing party bears full responsibility (100%) |
| Door-opening collision | Door-opening party bears full responsibility (100%) |
| Pedestrian crossing | Motor vehicle typically bears majority responsibility; reduced if pedestrian was at fault (motor vehicle generally not below 60%) |
| Non-motor vehicle accident | Apply motor vehicle rules by analogy; non-motor vehicle fault can reduce motor vehicle responsibility |

### 3. Multi-Vehicle Chain Accident Analysis

For accidents involving three or more vehicles, use the chain-of-liability analysis method:

1. Decompose the accident into a chain: "Initial Collision → Subsequent Collision(s) → Secondary Incident(s)"
2. Analyze fault and wrongful conduct independently for each collision in the chain
3. Distinguish between "causing the collision" and "aggravating the consequences" — these are different liability types
4. Final responsibility = weighted composite of each node's liability by contribution to overall harm

### 4. Special Circumstances

- **Force Majeure** (rainstorm, blizzard, earthquake, etc.): Reduces party responsibility but does not eliminate the duty of reasonable care
- **Emergency Avoidance**: Avoiding party's responsibility reduced or exempted; the party benefiting from the avoidance may bear compensatory liability
- **Gratuitous Carriage**: Driver's responsibility appropriately reduced (typically 10%-20% reduction)
- **No Clear Fault on Either Side**: Apportion by equitable principles, typically 50% each

## Output Requirements

- Each party's wrongful conduct must reference specific violation provisions or describe the specific wrongful behavior
- Fault percentages should be multiples of 5%
- The sum of all party fault percentages must equal 100%
- If there are disputed scenarios, list different viewpoints and their supporting reasoning in the conclusion
