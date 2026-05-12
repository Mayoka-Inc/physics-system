import * as THREE from 'three';

/**
 * Advanced Collision System for Neon Surge.
 * Features:
 * 1. Swept Sphere Collisions: Accounts for high-speed movement between frames.
 * 2. Impact Physics: Provides knockback/shake vectors for game feel.
 * 3. BVH Lite: Broad-phase spatial partitioning to handle many obstacles.
 */
export class CollisionSystem {
  constructor() {
    this.lastPlayerPos = new THREE.Vector3();
    this.impactVector = new THREE.Vector3();
    this.hasLastPos = false;
    
    // Collision tuning
    this.PLAYER_RADIUS = 1.2;
    this.OBSTACLE_RADIUS = 1.0;
    this.COLLISION_THRESHOLD = this.PLAYER_RADIUS + this.OBSTACLE_RADIUS;
    this.NEARBY_THRESHOLD = 8.0; // Range for impact/shake effects
  }

  /**
   * Main collision entry point.
   * @param {THREE.Object3D} playerMesh - The player's mesh or object.
   * @param {Array<THREE.Object3D>} obstaclesArray - Array of obstacles to check.
   * @returns {boolean} - True if a hard collision occurred.
   */
  checkCollision(playerMesh, obstaclesArray) {
    if (!playerMesh || !obstaclesArray) return false;

    const currentPos = playerMesh.position;
    let collided = false;

    // Reset impact vector for the current frame
    this.impactVector.set(0, 0, 0);

    // 1. BVH Lite: Broad-phase filtering (spatial culling)
    // Only process obstacles within a relevant range to optimize for large counts.
    const relevantObstacles = this._broadPhase(currentPos, obstaclesArray);

    for (const obstacle of relevantObstacles) {
      const obstaclePos = obstacle.position;
      
      // 2. Swept Sphere: Check path between frames
      let isHit = false;
      if (this.hasLastPos) {
        isHit = this._testSweptSphere(this.lastPlayerPos, currentPos, obstaclePos, this.COLLISION_THRESHOLD);
      } else {
        isHit = currentPos.distanceTo(obstaclePos) < this.COLLISION_THRESHOLD;
      }

      if (isHit) {
        collided = true;
        this._applyImpact(currentPos, obstaclePos, 2.0); // Hard hit impact
        break; // Stop at first collision
      }

      // 3. Impact Physics: Calculate proximity-based shake/knockback
      const distance = currentPos.distanceTo(obstaclePos);
      if (distance < this.NEARBY_THRESHOLD) {
        const intensity = 1.0 - (distance / this.NEARBY_THRESHOLD);
        this._applyImpact(currentPos, obstaclePos, intensity * 0.5);
      }
    }

    // Update historical state
    this.lastPlayerPos.copy(currentPos);
    this.hasLastPos = true;

    return collided;
  }

  /**
   * BVH Lite: Filters obstacles based on a simple spatial bounding box.
   */
  _broadPhase(playerPos, obstacles) {
    const range = 25;
    return obstacles.filter(obs => {
      return Math.abs(obs.position.z - playerPos.z) < range &&
             Math.abs(obs.position.x - playerPos.x) < 20;
    });
  }

  /**
   * Swept Sphere: Intersection test between a segment (player path) and a sphere (obstacle).
   */
  _testSweptSphere(p0, p1, center, radius) {
    const path = new THREE.Vector3().subVectors(p1, p0);
    const toCenter = new THREE.Vector3().subVectors(center, p0);
    const pathLenSq = path.lengthSq();

    if (pathLenSq < 0.0001) return p1.distanceTo(center) < radius;

    // Project center onto the path segment
    let t = toCenter.dot(path) / pathLenSq;
    t = Math.max(0, Math.min(1, t)); // Clamp to segment

    const closestPoint = new THREE.Vector3().copy(p0).add(path.multiplyScalar(t));
    return closestPoint.distanceTo(center) < radius;
  }

  /**
   * Impact Physics: Accumulates force vectors pointing away from obstacles.
   */
  _applyImpact(playerPos, obstaclePos, force) {
    const dir = new THREE.Vector3().subVectors(playerPos, obstaclePos).normalize();
    this.impactVector.add(dir.multiplyScalar(force));
  }

  /**
   * Accessor for Game Logic to retrieve the knockback/shake vector.
   */
  getImpactVector() {
    return this.impactVector;
  }

  /**
   * Calculates gravitational pull towards a singularity.
   * Uses inverse square law for magnitude.
   * @param {THREE.Vector3} playerPosition
   * @param {THREE.Vector3} singularityPosition
   * @param {number} intensity
   * @returns {THREE.Vector3}
   */
  calculateGravityPull(playerPosition, singularityPosition, intensity) {
    const pull = new THREE.Vector3().subVectors(singularityPosition, playerPosition);
    const distanceSq = Math.max(pull.lengthSq(), 1.0); // Clamp to avoid infinite force
    const magnitude = intensity / distanceSq;
    return pull.normalize().multiplyScalar(magnitude);
  }

  /**
   * Calculates a slight drift factor towards the nearest obstacle.
   * Helps simulate spatial turbulence or magnetic attraction.
   * @param {THREE.Vector3} playerPosition
   * @param {Array<THREE.Object3D>} obstaclesArray
   * @returns {THREE.Vector3}
   */
  calculateSpatialDrift(playerPosition, obstaclesArray) {
    const drift = new THREE.Vector3(0, 0, 0);
    if (!obstaclesArray || obstaclesArray.length === 0) return drift;

    let nearest = null;
    let minDist = Infinity;

    for (const obstacle of obstaclesArray) {
      const dist = playerPosition.distanceTo(obstacle.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = obstacle;
      }
    }

    if (nearest && minDist < 12.0) { // Drift range
      const strength = (1.0 - (minDist / 12.0)) * 0.1;
      drift.subVectors(nearest.position, playerPosition).normalize().multiplyScalar(strength);
    }

    return drift;
  }
}
