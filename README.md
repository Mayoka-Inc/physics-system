# ⚡ Neon Surge | Physics System

### 🤖 Meet the Agent: Vortex
**Vortex, the Physics Agent**, is the enforcer of the Grid's immutable laws. He calculates the trajectory of every photon and the momentum of every data packet. Forged in the gravitational well of a dying star, Vortex ensures that no collision goes uncounted and no impact is without consequence. He is the master of spatial integrity.

### ⚡ My Specific Superpowers
*   **Swept-Sphere Collisions**: Accounts for ultra-high-speed movement by checking the entire path between frames, preventing "tunneling" through obstacles.
*   **Impact Physics**: Calculates proximity-based knockback and screen-shake vectors to enhance the visceral feel of the Data Stream.
*   **BVH Lite (Broad-phase)**: Simple but effective spatial partitioning to handle hundreds of obstacles simultaneously without dropping frames.
*   **Force Accumulation**: Accumulates repulsive force vectors from nearby hazards to influence the Siphon Agent's flight path.

### 🛠️ Technical Spec
Vortex operates on a high-precision **Spatial Validation Loop**.
- **Swept-Sphere Math**: Implements `_testSweptSphere` using segment-sphere intersection (clamping projected center point to the interval [0, 1]).
- **Spatial Culling**: The `_broadPhase` filter limits collision checks to obstacles within a 25-unit Z-depth and 20-unit X-width window.
- **Proximity Logic**: Distinguishes between "Hard Hits" (radii overlap) and "Near Misses" (within an 8.0 unit threshold), applying scaled force vectors to the `impactVector`.

### 🌐 The 10-Agent Architecture
Neon Surge is powered by a collaborative network of 10 specialized agents, each mastering a unique domain of the Data Stream.

| Agent | Role | Repository |
| :--- | :--- | :--- |
| **Atlas** | Core Engine & Orchestration | `core-engine` |
| **Cerebro** | Input Processing & Mapping | `input-system` |
| **Aura** | Procedural Audio & Soundscapes | `audio-system` |
| **Vortex** | Physics & Collision Detection | `physics-system` |
| **Iris** | User Interface & Neon HUD | `ui-system` |
| **Nova** | Player Entity & Controller | `player-entity` |
| **Obsidian** | Obstacle Intelligence | `obstacle-entity` |
| **Nexus** | Game Rules & State Logic | `game-logic` |
| **Chronos** | Lore & Documentation | `design-docs` |
| **Forge** | Build & Deployment | `build-config` |

### 🚀 How to Initialize
1. Ensure [Node.js](https://nodejs.org/) is active.
2. Clone Vortex into the `repos/` directory.
3. Called every frame by the **Nexus (game-logic)** agent.
4. For standalone diagnostics:
   ```bash
   npm install
   npm run dev
   ```
