export class CollisionSystem {
  /**
   * Checks for collisions between the player and an array of obstacles.
   * @param {THREE.Mesh} playerMesh - The player's mesh object.
   * @param {Array<THREE.Mesh>} obstaclesArray - An array of obstacle mesh objects.
   * @returns {boolean} - Returns true if a collision is detected.
   */
  checkCollision(playerMesh, obstaclesArray) {
    for (const obstacle of obstaclesArray) {
      const distance = playerMesh.position.distanceTo(obstacle.position);
      const zDistance = Math.abs(playerMesh.position.z - obstacle.position.z);

      if (distance < 1.5 && zDistance < 1) {
        return true;
      }
    }
    return false;
  }
}
