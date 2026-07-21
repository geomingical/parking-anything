# Parking Anything Video Design System

## Overview

Parking Anything uses a light paper canvas, blunt black typography, and a bird's-eye parking grid to turn digital clutter into a physical decision system. The interface is flat, rectangular, and highly legible, with safety-yellow actions and green/red lifecycle semantics. The video should preserve this utilitarian identity while using camera movement, road markings, and top-down cars to create cinematic momentum. Product evidence remains crisp and readable rather than becoming decorative texture.

## Colors

- **Paper Canvas**: `#f7f7f2` — primary light surface and end-card background.
- **Primary Ink**: `#171918` — headlines, hard borders, and dark interstitials.
- **Muted Ink**: `#5f645f` — supporting narration copy and secondary labels.
- **Parking Asphalt**: `#4a4d4b` — road and parking-grid surfaces.
- **Deep Asphalt**: `#303331` — vehicle bays, dark scene backgrounds, and depth layers.
- **Safety Yellow**: `#f2c94c` — calls to action, route markers, and key words.
- **Garage Green**: `#2f7d5c` — adoption, decision support, and responsible-AI labels.
- **Scrapyard Red**: `#b84a45` — deliberate exit and rejection.
- **Parking Line**: `#ffffff` — road markings and high-contrast labels on asphalt.

## Typography

- **Primary Sans**: Arial, Helvetica, sans-serif. Use weights 700 and 900 for headlines and decisive labels; 400 for narration support.
- **Hero Scale**: 112–156px at 1920×1080, tightly tracked between `-0.04em` and `-0.02em`.
- **Section Scale**: 64–88px, weight 900.
- **Body Scale**: 28–36px, line-height 1.25–1.45.
- **Operational Labels**: 20–26px, uppercase, weight 900, tracking `0.14em`–`0.20em`.
- Use tabular numerals for counters and timestamps.

## Elevation

Depth comes from two-pixel ink borders, offset hard shadows, layered parking-grid planes, and controlled screenshot perspective. Avoid soft glass effects. Product screenshots sit inside crisp browser frames with a restrained eight-to-twelve-pixel offset shadow; cars and route lines can pass above or below those frames to connect scenes.

## Components

- **Unified Parking Grid**: Dark asphalt with white bay lines and one yellow active marker.
- **Parkable Vehicle Ticket**: Top-down car or dashed planning bay paired with compact status labels.
- **Capture Switcher**: Hard-edged Tool, Idea, and disabled Future modes.
- **Decision Inspector**: Right-side paper drawer with black dividers, planning controls, and evidence fields.
- **Lifecycle Tabs**: Parking Lot, Test Driving, Garage, and Scrapyard as a horizontal route.
- **Manager Patrol Panel**: White bordered panel separating Observed Fact from GPT-5.6 Recommendation.
- **Kinetic Road Label**: Large editorial copy aligned to route lines, not floating pill badges.
- **Browser Evidence Frame**: Real first-party screenshots cropped to the exact feature being narrated.

## Do's and Don'ts

### Do's

- Use exact product colors and hard rectangular geometry.
- Keep one dominant visual idea per beat and maintain a clear reading order.
- Animate cars along deliberate routes and let road markings motivate wipes.
- Distinguish observed facts, model recommendations, and user decisions visually.
- Preserve readable product evidence for at least two seconds per demonstrated capability.

### Don'ts

- Do not use neon gradients, glassmorphism, rounded SaaS cards, or generic blue tech styling.
- Do not invent product capabilities, collaboration flows, accounts, or cloud persistence.
- Do not imply that GPT-5.6 changes lifecycle state automatically.
- Do not make the Future controls look enabled or production-ready.
- Do not use rapid montage to conceal unreadable screenshots.
