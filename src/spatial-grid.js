/**
 * Spatial Grid - Spatial Partitioning for Efficient Collision Detection
 * Reduces collision checks from O(n²) to O(n log n)
 * 
 * Instead of checking every entity against every other entity,
 * divide the world into grid cells and only check entities in nearby cells.
 */

export class SpatialGrid {
  /**
   * @param {Object} options - Configuration options
   * @param {number} options.cellSize - Size of each grid cell (default: 10 units)
   * @param {number} options.worldSize - Size of the world (for pre-allocation)
   */
  constructor({ cellSize = 10, worldSize = 500 } = {}) {
    this.cellSize = cellSize;
    this.worldSize = worldSize;
    this.cells = new Map();
    
    // Statistics for debugging
    this.stats = {
      totalEntities: 0,
      activeCells: 0,
      maxEntitiesPerCell: 0,
      averageEntitiesPerCell: 0
    };
  }

  /**
   * Get cell key for a position
   * @private
   */
  _getCellKey(x, z) {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cz}`;
  }

  /**
   * Parse cell key back to coordinates
   * @private
   */
  _parseCellKey(key) {
    const [cx, cz] = key.split(',').map(Number);
    return { cx, cz };
  }

  /**
   * Clear all entities from grid
   */
  clear() {
    this.cells.clear();
    this.stats.totalEntities = 0;
    this.stats.activeCells = 0;
    this.stats.maxEntitiesPerCell = 0;
  }

  /**
   * Insert an entity into the grid
   * @param {Object} entity - Entity with position property
   */
  insert(entity) {
    if (!entity || !entity.pos || typeof entity.pos !== 'function') {
      console.warn('[SpatialGrid] Invalid entity, must have pos() method');
      return;
    }

    const pos = entity.pos();
    const key = this._getCellKey(pos.x, pos.z);
    
    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }
    
    this.cells.get(key).push(entity);
    this.stats.totalEntities++;
  }

  /**
   * Get entities in a specific cell
   * @param {number} x - X position
   * @param {number} z - Z position
   * @returns {Array} Entities in that cell
   */
  getCell(x, z) {
    const key = this._getCellKey(x, z);
    return this.cells.get(key) || [];
  }

  /**
   * Get entities near a position within a radius
   * @param {Object} position - Position {x, z}
   * @param {number} radius - Search radius
   * @returns {Array} Nearby entities
   */
  getNearby(position, radius) {
    const nearby = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerCx = Math.floor(position.x / this.cellSize);
    const centerCz = Math.floor(position.z / this.cellSize);

    // Check all cells within radius
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        const key = `${centerCx + dx},${centerCz + dz}`;
        const cell = this.cells.get(key);
        if (cell) {
          nearby.push(...cell);
        }
      }
    }

    return nearby;
  }

  /**
   * Get entities near a position within a radius, filtered by actual distance
   * @param {Object} position - Position {x, z}
   * @param {number} radius - Search radius
   * @param {Function} distanceFunc - Distance function (pos1, pos2) => number
   * @returns {Array} Nearby entities within actual radius
   */
  getNearbyFiltered(position, radius, distanceFunc) {
    const candidates = this.getNearby(position, radius);
    const radiusSq = radius * radius;
    
    return candidates.filter(entity => {
      const dist = distanceFunc(position, entity.pos());
      return dist * dist <= radiusSq;
    });
  }

  /**
   * Get all entities currently in the grid
   * @returns {Array} All entities
   */
  getAllEntities() {
    const all = [];
    for (const cell of this.cells.values()) {
      all.push(...cell);
    }
    return all;
  }

  /**
   * Update statistics
   */
  updateStats() {
    this.stats.activeCells = this.cells.size;
    this.stats.maxEntitiesPerCell = 0;
    let totalInCells = 0;

    for (const cell of this.cells.values()) {
      const count = cell.length;
      totalInCells += count;
      if (count > this.stats.maxEntitiesPerCell) {
        this.stats.maxEntitiesPerCell = count;
      }
    }

    this.stats.averageEntitiesPerCell = 
      this.stats.activeCells > 0 ? totalInCells / this.stats.activeCells : 0;
  }

  /**
   * Get grid statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Debug: Visualize grid (returns array of cell boundaries)
   * @returns {Array} Array of {x1, z1, x2, z2} cell boundaries
   */
  getCellBoundaries() {
    const boundaries = [];
    for (const key of this.cells.keys()) {
      const { cx, cz } = this._parseCellKey(key);
      boundaries.push({
        x1: cx * this.cellSize,
        z1: cz * this.cellSize,
        x2: (cx + 1) * this.cellSize,
        z2: (cz + 1) * this.cellSize,
        count: this.cells.get(key).length
      });
    }
    return boundaries;
  }

  /**
   * Get collision checks saved
   * @param {number} entityCount - Total number of entities
   * @returns {Object} Comparison of checks
   */
  getEfficiency(entityCount) {
    const withoutGrid = entityCount * (entityCount - 1) / 2; // O(n²) checks
    
    // With grid: average entities per cell × nearby cells
    const avgPerCell = this.stats.averageEntitiesPerCell || 1;
    const cellsToCheck = 9; // 3x3 grid around entity
    const withGrid = entityCount * avgPerCell * cellsToCheck;
    
    const saved = withoutGrid - withGrid;
    const percent = withoutGrid > 0 ? (saved / withoutGrid) * 100 : 0;

    return {
      withoutGrid,
      withGrid,
      checksSaved: saved,
      percentSaved: percent
    };
  }
}

/**
 * Factory function for backward compatibility
 */
export function createSpatialGrid(options) {
  return new SpatialGrid(options);
}
