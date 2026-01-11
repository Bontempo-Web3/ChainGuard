export class TransferAnalytics {
  private trees: IsolationTree[] = []
  private values: number[] = []
  private maxSize = 50
  private trained = false
  private numTrees = 10

  addValue(amount: number) {
    this.values.push(amount)
    if (this.values.length > this.maxSize) {
      this.values.shift()
    }

    // Retrain when we have enough data
    if (this.values.length >= 20 && this.values.length % 5 === 0) {
      this.train()
    }
  }

  private train() {
    this.trees = []
    for (let i = 0; i < this.numTrees; i++) {
      const tree = new IsolationTree(8)
      tree.fit(this.values)
      this.trees.push(tree)
    }
    this.trained = true
  }

  isAnomaly(amount: number): boolean {
    if (!this.trained || this.values.length < 20) return false

    const avgDepth = this.trees.reduce((sum, tree) => sum + tree.pathLength(amount), 0) / this.trees.length
    const avgPathLength = this.values.length > 1 ? this.averagePathLength(this.values.length) : 1
    const anomalyScore = Math.pow(2, -avgDepth / avgPathLength)

    // Score > 0.6 indicates anomaly
    return anomalyScore > 0.6
  }

  private averagePathLength(n: number): number {
    if (n <= 1) return 0
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n)
  }
}

class IsolationTree {
  private root: TreeNode | null = null
  private maxDepth: number

  constructor(maxDepth: number) {
    this.maxDepth = maxDepth
  }

  fit(data: number[]) {
    this.root = this.buildTree(data, 0)
  }

  private buildTree(data: number[], depth: number): TreeNode | null {
    if (depth >= this.maxDepth || data.length <= 1) {
      return { size: data.length, isLeaf: true }
    }

    const min = Math.min(...data)
    const max = Math.max(...data)
    
    if (min === max) {
      return { size: data.length, isLeaf: true }
    }

    const splitValue = min + Math.random() * (max - min)
    const left = data.filter(v => v < splitValue)
    const right = data.filter(v => v >= splitValue)

    if (left.length === 0 || right.length === 0) {
      return { size: data.length, isLeaf: true }
    }

    return {
      splitValue,
      left: this.buildTree(left, depth + 1),
      right: this.buildTree(right, depth + 1),
      size: data.length,
      isLeaf: false
    }
  }

  pathLength(value: number): number {
    return this.traverse(this.root, value, 0)
  }

  private traverse(node: TreeNode | null, value: number, depth: number): number {
    if (!node || node.isLeaf) {
      return depth + (node ? this.adjustedSize(node.size) : 0)
    }

    if (value < node.splitValue!) {
      return this.traverse(node.left!, value, depth + 1)
    } else {
      return this.traverse(node.right!, value, depth + 1)
    }
  }

  private adjustedSize(size: number): number {
    if (size <= 1) return 0
    return 2 * (Math.log(size - 1) + 0.5772156649) - (2 * (size - 1) / size)
  }
}

interface TreeNode {
  splitValue?: number
  left?: TreeNode | null
  right?: TreeNode | null
  size: number
  isLeaf: boolean
}