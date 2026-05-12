# 🛡️ Neon Surge | Physics System

### 🤖 Meet the Agent: Newton
**Newton, the Physics Agent**, is the backbone of reality in the Data Stream. Disciplined and precise, he enforces the mathematical laws of the universe with an iron fist. Newton doesn't just calculate vectors; he ensures that every collision has weight and every movement follows the sacred geometry of the grid.

### ⚡ Superpowers
*   **Swept-Sphere Collisions**: High-velocity detection to prevent tunneling through neon walls.
*   **Impact Physics**: Realistic momentum transfer for satisfying kinetic collisions.
*   **BVH-Lite**: Lightweight Bounding Volume Hierarchy for ultra-fast spatial queries.
*   **Cylindrical Mapping**: Advanced coordinate transformations for the game's unique tunnel geometry.

### 🌐 The 10-Agent Architecture
Neon Surge is powered by a collaborative network of 10 specialized agents, each mastering a unique domain of the Data Stream.

| Agent | Role | Repository |
| :--- | :--- | :--- |
| **The Heart** | Core Engine & Orchestration | `core-engine` |
| **The Senses** | Input Processing & Mapping | `input-system` |
| **The Voice** | Procedural Audio & Soundscapes | `audio-system` |
| **The Laws** | Physics & Collision Detection | `physics-system` |
| **The Face** | User Interface & Neon HUD | `ui-system` |
| **The Hero** | Player Entity & Controller | `player-entity` |
| **The Hazard** | Obstacle Intelligence | `obstacle-entity` |
| **The Mastermind** | Game Rules & State Logic | `game-logic` |
| **The Blueprint** | Lore & Documentation | `design-docs` |
| **The Architect** | Build & Deployment | `build-config` |

### 🛠️ How to Run
1. Ensure you have [Node.js](https://nodejs.org/) installed.
2. Clone this agent into the `repos/` directory.
3. This agent is typically orchestrated by the [build-config](https://github.com/mayoka0/build-config) agent.
4. To run standalone tests:
   ```bash
   npm install
   npm run dev
   ```
