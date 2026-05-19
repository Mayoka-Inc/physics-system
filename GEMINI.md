# Vortex | Physics System Agent Instructions

## Overview
Vortex is a high-performance collision and physics engine for Neon Surge, optimized with TypedArrays and a custom Bounding Volume Hierarchy (BVH) to minimize GC pressure and maximize throughput.

## Core Components
- `CollisionSystem.js`: Main engine featuring BVH broad-phase and swept-sphere narrow-phase.
- `WASM-Style Memory`: Uses `Float32Array` for contiguous storage of obstacle data `[x, y, z, radius]`.
- `Swept-Sphere Math`: Prevents tunneling by checking the player's movement segment against obstacle volumes.
- `BVH Lite`: An adaptive tree structure for fast spatial partitioning.

## Coding Standards
- **Memory Management**: Minimize object allocation in the hot path. Reuse `THREE.Vector3` instances or use raw math with TypedArrays.
- **Bitwise Operations**: Use bitwise shifts (`i << 2`) for fast indexing into TypedArrays.
- **Spatial Integrity**: Always synchronize THREE.js scene data into the `obstacleData` buffer before running collision checks.

## Physics Tuning
- `PLAYER_RADIUS (1.2)`: The effective collision size of the player.
- `OBSTACLE_RADIUS (1.0)`: Default size for obstacles if not specified in `userData`.
- `NEARBY_THRESHOLD (8.0)`: Range for proximity-based repulsive forces.

## Future Improvements
- [ ] Port the core collision loop to a Web Worker for parallel execution.
- [ ] Implement a full SAT (Separating Axis Theorem) check for non-spherical obstacles.
- [ ] Add support for continuous collision detection (CCD) for all moving entities.
- [ ] Add unit tests for `_testSweptSphereRaw` and BVH node splitting logic.
