class Cell {
  constructor(public i: number, public j: number) {}

  // Other methods and properties related to the grid cell can be added here
}

class CellFactory {
  private static cells: { [key: string]: Cell } = {};

  static getCell(i: number, j: number): Cell {
    const key = `${i}-${j}`;
    if (!CellFactory.cells[key]) {
      CellFactory.cells[key] = new Cell(i, j);
    }
    return CellFactory.cells[key];
  }
}

class Board {
  private knownCells: Map<string, Cell>;

  constructor() {
    this.knownCells = new Map();
  }

  getGridCell(x: number, y: number): Cell {
    const step = 0.0001;
    const i = Math.round(x / step);
    const j = Math.round(y / step);
    const key = `${i}_${j}`;
    if (this.knownCells.has(key)) {
      return this.knownCells.get(key)!;
    }
    const newCell: Cell = CellFactory.getCell(i, j);
    this.knownCells.set(key, newCell);
    return newCell;
  }

  getBoard(): Map<string, Cell> {
    return this.knownCells;
  }

  printBoard() {
    console.log(this.knownCells);
  }

  clearBoard() {
    this.knownCells.clear();
  }
}

export { Cell, CellFactory, Board };
