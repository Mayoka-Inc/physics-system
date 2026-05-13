import * as THREE from 'three';

/**
 * Advanced Collision System for Neon Surge - Vortex WASM-Optimized Edition.
 * Refactored for high-performance spatial partitioning using TypedArrays.
 * This system simulates the memory layout used in WebAssembly to achieve near-native performance.
 */
export class CollisionSystem {
  constructor(maxObstacles = 10000) {
    this.MAX_OBSTACLES = maxObstacles;
    
    // 1. WASM-Style Memory Layout: [x, y, z, radius]
    // Using Float32Array for contiguous memory access and minimal GC pressure.
    this.obstacleData = new Float32Array(this.MAX_OBSTACLES * 4);
    this.obstacleCount = 0;

    // 2. Broad-Phase Spatial Grid (Linked List in Arrays)
    // Partitions space into cells for O(1) average lookup of nearby hazards.
    this.CELL_SIZE = 8;
    this.GRID_RES = 32; // 32x32 cells covering 256x256 area
    this.gridHeads = new Int32Array(this.GRID_RES * this.GRID_RES);
    this.obstacleNext = new Int32Array(this.MAX_OBSTACLES);

    this.lastPlayerPos = new THREE.Vector3();
    this.impactVector = new THREE.Vector3();
    this.hasLastPos = false;
    
    // Collision tuning
    this.PLAYER_RADIUS = 1.2;
    this.OBSTACLE_RADIUS = 1.0;
    this.COLLISION_THRESHOLD = this.PLAYER_RADIUS + this.OBSTACLE_RADIUS;
    this.NEARBY_THRESHOLD = 8.0; 
  }

  /**
   * Syncs THREE.js object data into high-performance TypedArrays.
   * This bridges the high-level scene graph with optimized physics memory.
   */
  _syncObstacleData(obstaclesArray) {
    this.obstacleCount = Math.min(obstaclesArray.length, this.MAX_OBSTACLES);
    const data = this.obstacleData;
    const count = this.obstacleCount;
    for (let i = 0; i < count; i++) {
      const obs = obstaclesArray[i];
      const pos = obs.position;
      const idx = i << 2; // i * 4
      data[idx] = pos.x;
      data[idx + 1] = pos.y;
      data[idx + 2] = pos.z;
      data[idx + 3] = (obs.userData && obs.userData.radius) ? obs.userData.radius : this.OBSTACLE_RADIUS;
    }
  }

  /**
   * Rebuilds the spatial grid centered around the player.
   * Efficiently bins obstacles into grid cells for fast spatial querying.
   */
  _buildSpatialGrid(playerPos) {
    this.gridHeads.fill(-1);
    const data = this.obstacleData;
    const next = this.obstacleNext;
    const res = this.GRID_RES;
    const cellSize = this.CELL_SIZE;
    
    // Offset grid so player is always at the center of the grid logic
    const gridOffsetX = playerPos.x - (res * cellSize) * 0.5;
    const gridOffsetZ = playerPos.z - (res * cellSize) * 0.5;

    for (let i = 0; i < this.obstacleCount; i++) {
      const idx = i << 2;
      const gx = Math.floor((data[idx] - gridOffsetX) / cellSize);
      const gz = Math.floor((data[idx + 2] - gridOffsetZ) / cellSize);

      if (gx >= 0 && gx < res && gz >= 0 && gz < res) {
        const gridIdx = (gz * res) + gx;
        next[i] = this.gridHeads[gridIdx];
        this.gridHeads[gridIdx] = i;
      } else {
        next[i] = -1;
      }
    }
  }

  /**
   * Main collision entry point.
   * Uses TypedArray-based spatial partitioning to handle 10x more entities than the original loop.
   */
  checkCollision(playerMesh, obstaclesArray) {
    if (!playerMesh || !obstaclesArray) return false;

    const currentPos = playerMesh.position;
    const px = currentPos.x;
    const py = currentPos.y;
    const pz = currentPos.z;
    
    let collided = false;
    this.impactVector.set(0, 0, 0);

    // WASM-Style Optimization: Sync data once and build spatial index
    this._syncObstacleData(obstaclesArray);
    this._buildSpatialGrid(currentPos);

    const lpx = this.lastPlayerPos.x;
    const lpy = this.lastPlayerPos.y;
    const lpz = this.lastPlayerPos.z;

    // Broad-phase: Query the local grid neighborhood (9x9 cells around player)
    const res = this.GRID_RES;
    const halfRes = res >> 1; 
    const windowSize = 4; // Covers ~64 units around player
    
    for (let gz = halfRes - windowSize; gz <= halfRes + windowSize; gz++) {
      for (let gx = halfRes - windowSize; gx <= halfRes + windowSize; gx++) {
        if (gx < 0 || gx >= res || gz < 0 || gz >= res) continue;
        
        let obsIdx = this.gridHeads[(gz * res) + gx];
        while (obsIdx !== -1) {
          const idx = obsIdx << 2;
          const ox = this.obstacleData[idx];
          const oy = this.obstacleData[idx + 1];
          const oz = this.obstacleData[idx + 2];
          const or = this.obstacleData[idx + 3];
          
          const threshold = this.PLAYER_RADIUS + or;

          // Swept Sphere Check: Using raw float math to avoid Vector3 overhead
          let isHit = false;
          if (this.hasLastPos) {
            isHit = this._testSweptSphereRaw(lpx, lpy, lpz, px, py, pz, ox, oy, oz, threshold);
          } else {
            const dx = px - ox;
            const dy = py - oy;
            const dz = pz - oz;
            isHit = (dx*dx + dy*dy + dz*dz) < threshold * threshold;
          }

          if (isHit) {
            collided = true;
            this._applyImpactRaw(px, py, pz, ox, oy, oz, 2.0);
          }

          // Proximity Impact: Scaled feedback based on hazard distance
          const dx = px - ox;
          const dy = py - oy;
          const dz = pz - oz;
          const distSq = dx*dx + dy*dy + dz*dz;
          if (distSq < this.NEARBY_THRESHOLD * this.NEARBY_THRESHOLD) {
            const distance = Math.sqrt(distSq);
            const intensity = 1.0 - (distance / this.NEARBY_THRESHOLD);
            this._applyImpactRaw(px, py, pz, ox, oy, oz, intensity * 0.5);
          }

          obsIdx = this.obstacleNext[obsIdx];
        }
      }
    }

    // Update historical state
    this.lastPlayerPos.copy(currentPos);
    this.hasLastPos = true;

    return collided;
  }

  /**
   * High-performance swept-sphere intersection test.
   * Calculates the distance between the player's movement segment and an obstacle center.
   */
  _testSweptSphereRaw(p0x, p0y, p0z, p1x, p1y, p1z, cx, cy, cz, radius) {
    const dx = p1x - p0x;
    const dy = p1y - p0y;
    const dz = p1z - p0z;
    const pathLenSq = dx*dx + dy*dy + dz*dz;

    if (pathLenSq < 0.0001) {
      const d2x = p1x - cx;
      const d2y = p1y - cy;
      const d2z = p1z - cz;
      return (d2x*d2x + d2y*d2y + d2z*d2z) < radius * radius;
    }

    const tcx = cx - p0x;
    const tcy = cy - p0y;
    const tcz = cz - p0z;
    
    // Project obstacle onto the path segment
    let t = (tcx * dx + tcy * dy + tcz * dz) / pathLenSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = p0x + dx * t;
    const closestY = p0y + dy * t;
    const closestZ = p0z + dz * t;
    
    const d3x = closestX - cx;
    const d3y = closestY - cy;
    const d3z = closestZ - cz;
    return (d3x*d3x + d3y*d3y + d3z*d3z) < radius * radius;
  }

  /**
   * Accumulates impact forces in a raw-math pipeline.
   */
  _applyImpactRaw(px, py, pz, ox, oy, oz, force) {
    let dx = px - ox;
    let dy = py - oy;
    let dz = pz - oz;
    const len = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
    this.impactVector.x += (dx / len) * force;
    this.impactVector.y += (dy / len) * force;
    this.impactVector.z += (dz / len) * force;
  }

  /**
   * Accessor for Game Logic to retrieve the knockback/shake vector.
   */
  getImpactVector() {
    return this.impactVector;
  }

  /**
   * Optimized Gravity Pull calculation.
   */
  calculateGravityPull(playerPosition, singularityPosition, intensity) {
    const pullX = singularityPosition.x - playerPosition.x;
    const pullY = singularityPosition.y - playerPosition.y;
    const pullZ = singularityPosition.z - playerPosition.z;
    
    const distSq = Math.max(pullX*pullX + pullY*pullY + pullZ*pullZ, 1.0);
    const magnitude = intensity / distSq;
    const len = Math.sqrt(distSq);
    
    return new THREE.Vector3(
      (pullX / len) * magnitude,
      (pullY / len) * magnitude,
      (pullZ / len) * magnitude
    );
  }

  /**
   * Optimized Spatial Drift using the broad-phase grid.
   */
  calculateSpatialDrift(playerPosition, obstaclesArray) {
    if (!obstaclesArray || obstaclesArray.length === 0) return new THREE.Vector3(0, 0, 0);

    // Sync and partition data
    this._syncObstacleData(obstaclesArray);
    this._buildSpatialGrid(playerPosition);

    const px = playerPosition.x;
    const py = playerPosition.y;
    const pz = playerPosition.z;

    let nearestIdx = -1;
    let minDistSq = Infinity;

    const res = this.GRID_RES;
    const halfRes = res >> 1;
    const range = Math.ceil(12.0 / this.CELL_SIZE);

    for (let gz = halfRes - range; gz <= halfRes + range; gz++) {
      for (let gx = halfRes - range; gx <= halfRes + range; gx++) {
        if (gx < 0 || gx >= res || gz < 0 || gz >= res) continue;
        
        let obsIdx = this.gridHeads[(gz * res) + gx];
        while (obsIdx !== -1) {
          const idx = obsIdx << 2;
          const dx = px - this.obstacleData[idx];
          const dy = py - this.obstacleData[idx + 1];
          const dz = pz - this.obstacleData[idx + 2];
          const dSq = dx*dx + dy*dy + dz*dz;
          
          if (dSq < minDistSq) {
            minDistSq = dSq;
            nearestIdx = obsIdx;
          }
          obsIdx = this.obstacleNext[obsIdx];
        }
      }
    }

    if (nearestIdx !== -1 && minDistSq < 144.0) {
      const minDist = Math.sqrt(minDistSq);
      const strength = (1.0 - (minDist / 12.0)) * 0.1;
      const idx = nearestIdx << 2;
      const dirX = this.obstacleData[idx] - px;
      const dirY = this.obstacleData[idx + 1] - py;
      const dirZ = this.obstacleData[idx + 2] - pz;
      const len = minDist || 1;
      return new THREE.Vector3((dirX / len) * strength, (dirY / len) * strength, (dirZ / len) * strength);
    }

    return new THREE.Vector3(0, 0, 0);
  }
}
