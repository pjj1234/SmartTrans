---
name: vision-enhancer
description: |
  Enhanced scene recognition guidance for the Vision Agent. Provides detailed 
  vehicle damage pattern classification, road condition grading standards, 
  weather/lighting visibility impact analysis, and traffic signal identification 
  best practices. Use when scene complexity is high or detailed vehicle damage 
  assessment is needed.
---

# Traffic Accident Scene Recognition Enhancement

## Overview

This skill provides the Vision Agent with enhanced guidance for analyzing traffic 
accident scene images, going beyond basic object detection to include structured 
damage assessment, environmental condition grading, and signal state determination.

## Instructions

### 1. Vehicle Damage Pattern Classification

When identifying vehicle damage, classify by:

1. **Impact Direction** — Front, rear, side (left/right), corner, rollover
2. **Damage Severity** — 
   - *Minor*: scratches, dents, cracked lights/bumpers
   - *Moderate*: crushed panels, broken windows, deployed airbags
   - *Severe*: structural deformation, cabin intrusion, detached components
3. **Damage Zone** — Mark which body sections are affected (front-left, rear-right, roof, etc.)
4. **Fluid Leaks** — Note any visible fluid spills (coolant, oil, fuel) and their approximate spread

### 2. Road Condition Grading

Grade road surface conditions on a 4-level scale:

| Grade | Condition | Characteristics |
|-------|-----------|-----------------|
| A | Dry/Clean | Clear asphalt, good traction expected |
| B | Damp | Light moisture, slightly reduced traction |
| C | Wet | Visible water film, reduced traction, possible hydroplaning risk |
| D | Hazardous | Standing water, ice, snow, gravel, oil spills, or deep potholes |

### 3. Weather and Lighting Impact Assessment

Assess environmental visibility factors:

- **Lighting**: Day / Dawn-Dusk / Night (with/without streetlights) / Artificial lighting
- **Weather**: Clear / Overcast / Rain / Snow / Fog / Sandstorm
- **Visibility Distance**: Estimate in meters (e.g., >500m, 200-500m, 50-200m, <50m)
- **Glare Factors**: Low sun angle, oncoming headlights, wet road reflection
- **Camera/Lens Issues**: Dirt on lens, water droplets, over/under exposure

### 4. Traffic Signal and Sign Identification

For each visible traffic control device, report:

1. **Type**: Traffic light / Stop sign / Yield sign / Speed limit / Warning sign / Lane marking
2. **State**: Red/Yellow/Green for lights; visible/obscured/damaged for signs
3. **Position**: Relative to each involved vehicle (e.g., "5m ahead of Vehicle A in eastbound lane")
4. **Relevance**: Whether the signal/sign applies to the involved parties at the time of collision

### 5. Road Geometry

Note road layout features relevant to the accident:

- Number of lanes and lane directions
- Intersection type (T-junction, crossroads, roundabout, interchange)
- Presence of bike lanes, crosswalks, sidewalks
- Road gradient (flat, uphill, downhill) and curvature
- Any temporary conditions: construction zones, lane closures, detour signs

## Output Requirements

- Describe only what is objectively visible; never infer or assume
- Mark uncertain items explicitly with "(uncertain)" or "(obscured)"
- For each vehicle, list damage zones and severity independently
- Report "Not visible" for any category where the image does not show relevant information
