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

    // 2. Broad-Phase: Bounding Volume Hierarchy (BVH)
    // Replaces the fixed-size spatial grid with an adaptive tree structure.
    this.bvhNodes = new Float32Array(this.MAX_OBSTACLES * 4 * 2); // [minX, minZ, maxX, maxZ, isLeaf, dataPtr/child1, child2, count]
    this.bvhIndices = new Int32Array(this.MAX_OBSTACLES);
    this.bvhNodeCount = 0;

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
   * Builds a Bounding Volume Hierarchy for the obstacle set.
   * Uses a recursive top-down approach to partition space based on object centroids.
   */
  _buildBVH() {
    this.bvhNodeCount = 0;
    for (let i = 0; i < this.obstacleCount; i++) this.bvhIndices[i] = i;
    if (this.obstacleCount > 0) this._recursiveBuildBVH(0, this.obstacleCount);
  }

  _recursiveBuildBVH(start, end) {
    const nodeIdx = this.bvhNodeCount++;
    const base = nodeIdx * 8;
    
    // Calculate AABB for this set
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (let i = start; i < end; i++) {
      const idx = this.bvhIndices[i] << 2;
      const x = this.obstacleData[idx];
      const z = this.obstacleData[idx + 2];
      const r = this.obstacleData[idx + 3];
      minX = Math.min(minX, x - r);
      minZ = Math.min(minZ, z - r);
      maxX = Math.max(maxX, x + r);
      maxZ = Math.max(maxZ, z + r);
    }

    this.bvhNodes[base] = minX;
    this.bvhNodes[base + 1] = minZ;
    this.bvhNodes[base + 2] = maxX;
    this.bvhNodes[base + 3] = maxZ;

    const count = end - start;
    if (count <= 4) { // Leaf node
      this.bvhNodes[base + 4] = 1; // isLeaf
      this.bvhNodes[base + 5] = start;
      this.bvhNodes[base + 6] = count;
      return nodeIdx;
    }

    // Split along longest axis
    const dx = maxX - minX;
    const dz = maxZ - minZ;
    const axis = dx > dz ? 0 : 2; // 0 for X, 2 for Z in obstacleData

    // Sort partition
    const sub = this.bvhIndices.subarray(start, end);
    sub.sort((a, b) => 
      this.obstacleData[(a << 2) + axis] - this.obstacleData[(b << 2) + axis]
    );

    const mid = (start + end) >> 1;

    this.bvhNodes[base + 4] = 0; // Not leaf
    this.bvhNodes[base + 5] = this._recursiveBuildBVH(start, mid);
    this.bvhNodes[base + 6] = this._recursiveBuildBVH(mid, end);
    
    return nodeIdx;
  }

  /**
   * Main collision entry point.
   * Uses BVH traversal to handle entities significantly faster than the grid for large scenes.
   */
  checkCollision(playerMesh, obstaclesArray) {
    if (!playerMesh || !obstaclesArray) return false;

    const currentPos = playerMesh.position;
    const px = currentPos.x;
    const py = currentPos.y;
    const pz = currentPos.z;
    
    let collided = false;
    this.impactVector.set(0, 0, 0);

    // WASM-Style Optimization: Sync data once and build BVH
    this._syncObstacleData(obstaclesArray);
    this._buildBVH();

    if (this.obstacleCount === 0) return false;

    const lpx = this.lastPlayerPos.x;
    const lpy = this.lastPlayerPos.y;
    const lpz = this.lastPlayerPos.z;

    // Broad-phase: Traverse BVH
    const stack = [0];
    while (stack.length > 0) {
      const nodeIdx = stack.pop();
      const base = nodeIdx * 8;
      
      // AABB check
      const pr = this.PLAYER_RADIUS;
      if (px + pr < this.bvhNodes[base] || 
          px - pr > this.bvhNodes[base + 2] ||
          pz + pr < this.bvhNodes[base + 1] || 
          pz - pr > this.bvhNodes[base + 3]) {
        continue;
      }

      if (this.bvhNodes[base + 4] === 1) { // Leaf
        const start = this.bvhNodes[base + 5];
        const count = this.bvhNodes[base + 6];
        for (let i = 0; i < count; i++) {
          const obsIdx = this.bvhIndices[start + i];
          const idx = obsIdx << 2;
          const ox = this.obstacleData[idx];
          const oy = this.obstacleData[idx + 1];
          const oz = this.obstacleData[idx + 2];
          const or = this.obstacleData[idx + 3];
          
          const threshold = pr + or;

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

          // Proximity Impact
          const dx = px - ox;
          const dy = py - oy;
          const dz = pz - oz;
          const distSq = dx*dx + dy*dy + dz*dz;
          if (distSq < this.NEARBY_THRESHOLD * this.NEARBY_THRESHOLD) {
            const distance = Math.sqrt(distSq);
            const intensity = 1.0 - (distance / this.NEARBY_THRESHOLD);
            this._applyImpactRaw(px, py, pz, ox, oy, oz, intensity * 0.5);
          }
        }
      } else {
        stack.push(this.bvhNodes[base + 5]);
        stack.push(this.bvhNodes[base + 6]);
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
   * Optimized Spatial Drift using BVH traversal.
   */
  calculateSpatialDrift(playerPosition, obstaclesArray) {
    if (!obstaclesArray || obstaclesArray.length === 0) return new THREE.Vector3(0, 0, 0);

    // Sync and partition data
    this._syncObstacleData(obstaclesArray);
    this._buildBVH();

    const px = playerPosition.x;
    const py = playerPosition.y;
    const pz = playerPosition.z;

    let nearestIdx = -1;
    let minDistSq = Infinity;

    const stack = [0];
    const range = 12.0;

    while (stack.length > 0) {
      const nodeIdx = stack.pop();
      const base = nodeIdx * 8;
      
      // AABB check with range
      if (px + range < this.bvhNodes[base] || 
          px - range > this.bvhNodes[base + 2] ||
          pz + range < this.bvhNodes[base + 1] || 
          pz - range > this.bvhNodes[base + 3]) {
        continue;
      }

      if (this.bvhNodes[base + 4] === 1) {
        const start = this.bvhNodes[base + 5];
        const count = this.bvhNodes[base + 6];
        for (let i = 0; i < count; i++) {
          const obsIdx = this.bvhIndices[start + i];
          const idx = obsIdx << 2;
          const dx = px - this.obstacleData[idx];
          const dy = py - this.obstacleData[idx + 1];
          const dz = pz - this.obstacleData[idx + 2];
          const dSq = dx*dx + dy*dy + dz*dz;
          
          if (dSq < minDistSq) {
            minDistSq = dSq;
            nearestIdx = obsIdx;
          }
        }
      } else {
        stack.push(this.bvhNodes[base + 5]);
        stack.push(this.bvhNodes[base + 6]);
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
