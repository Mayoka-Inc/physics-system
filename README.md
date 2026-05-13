<div align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=24&pause=1000&color=7aa2f7&center=true&vCenter=true&width=600&lines=Vortex:+Analyzing+Gravity+Vectors...;Calculating+Spatial+Trajectories...;Physics+Engine+Locked." alt="Typing SVG" />
</div>

# ⚡ Neon Surge | Physics System

### 📊 Agent Telemetry
<div align="center">
  <img src="https://github-readme-activity-graph.vercel.app/graph?username=mayoka0&theme=tokyo-night&hide_border=true&area=true" width="100%" alt="Activity Graph" />
</div>

### 🤖 Meet the Agent: Vortex
**Vortex, the Physics Agent**, is the enforcer of the Grid's immutable laws. He calculates the trajectory of every photon and the momentum of every data packet. Forged in the gravitational well of a dying star, Vortex ensures that no collision goes uncounted and no impact is without consequence. He is the master of spatial integrity.

### ⚡ My Specific Superpowers
*   **Swept-Sphere Collisions**: Accounts for ultra-high-speed movement by checking the entire path between frames, preventing "tunneling" through obstacles.
*   **Impact Physics**: Calculates proximity-based knockback and screen-shake vectors to enhance the visceral feel of the Data Stream.
*   **BVH Lite (Broad-phase)**: Simple but effective spatial partitioning to handle hundreds of obstacles simultaneously without dropping frames.
*   **Force Accumulation**: Accumulates repulsive force vectors from nearby hazards to influence the Siphon Agent's flight path.

### 🛠️ Technical Spec
Vortex operates on a high-precision **Spatial Validation Loop** designed to maintain physical integrity at extreme velocities. The cornerstone of this system is the **Swept-Sphere Math** algorithm, which addresses the common "tunneling" issue in game physics. By treating the player's movement as a continuous volume rather than discrete points, Vortex can detect collisions that occur between frames. It implements this by calculating the distance between the player's movement segment and the centers of spherical obstacle volumes, effectively ensuring that no data hazard is bypassed.

To maintain a consistent 60 FPS, Vortex utilizes a **BVH Lite (Broad-phase)** spatial partitioning strategy. This filter significantly reduces the computational overhead by limiting collision checks to objects within the immediate vicinity of the player—specifically a 25-unit Z-depth and 20-unit X-width window. For objects that pass the broad-phase check, the system applies proximity logic to distinguish between "Hard Hits" (radii overlap) and "Near Misses." Near misses trigger scaled repulsive force vectors that influence the player's trajectory, adding a layer of tactile feedback to the navigation experience.

---

<div align="center">
  <img src="https://github-readme-stats.vercel.app/api/pin/?username=mayoka0&repo=physics-system&theme=tokyonight&hide_border=true&title_color=7aa2f7&icon_color=7aa2f7&text_color=ffffff" alt="Repo Card" />
</div>

🔗 **Part of the [Neon Surge Ecosystem](https://github.com/mayoka0/mayoka0#-neon-surge-architecture)**

### 🚀 How to Initialize
1. Ensure [Node.js](https://nodejs.org/) is active.
2. Clone Vortex into the `repos/` directory.
3. Called every frame by the **Nexus (game-logic)** agent.
4. For standalone diagnostics:
   ```bash
   npm install
   npm run dev
   ```
