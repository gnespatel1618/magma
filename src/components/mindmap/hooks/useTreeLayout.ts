import { useMemo } from 'react';

export interface NoteMeta {
  id: string;
  path: string;
  title: string;
  type?: 'file' | 'folder';
  children?: NoteMeta[];
}

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data: NoteMeta;
  depth: number;
  parentId: string | null;
  isCollapsed: boolean;
  childrenIds: string[];
}

export interface LayoutConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalGap?: number;
  verticalGap?: number;
  rootX?: number;
  rootY?: number;
}

interface TreeNode {
  node: NoteMeta;
  children: TreeNode[];
  width: number;
  height: number;
  x: number;
  y: number;
  depth: number;
}

export function useTreeLayout(
  notes: NoteMeta[],
  collapsedNodes: Set<string>,
  options: LayoutOptions = {}
) {
  const {
    nodeWidth = 160,
    nodeHeight = 48,
    horizontalGap = 200,
    verticalGap = 24,
    rootX = 100,
    rootY = 100,
  } = options;

  return useMemo(() => {
    const layoutNodes: Map<string, LayoutNode> = new Map();
    const connections: LayoutConnection[] = [];

    // Build internal tree structure
    function buildTree(items: NoteMeta[], depth: number = 0): TreeNode[] {
      return items.map(item => {
        const isCollapsed = collapsedNodes.has(item.id);
        const children = (!isCollapsed && item.children) 
          ? buildTree(item.children, depth + 1) 
          : [];
        
        return {
          node: item,
          children,
          width: nodeWidth,
          height: nodeHeight,
          x: 0,
          y: 0,
          depth,
        };
      });
    }

    // Calculate subtree heights for spacing
    function calculateSubtreeHeight(tree: TreeNode): number {
      if (tree.children.length === 0) {
        return nodeHeight;
      }
      
      let totalHeight = 0;
      tree.children.forEach((child, i) => {
        totalHeight += calculateSubtreeHeight(child);
        if (i < tree.children.length - 1) {
          totalHeight += verticalGap;
        }
      });
      
      return Math.max(nodeHeight, totalHeight);
    }

    // Position nodes using the calculated heights
    function positionTree(tree: TreeNode, x: number, y: number, parentId: string | null = null) {
      tree.x = x;
      tree.y = y;
      
      // Create layout node
      const layoutNode: LayoutNode = {
        id: tree.node.id,
        x: tree.x,
        y: tree.y,
        width: nodeWidth,
        height: nodeHeight,
        data: tree.node,
        depth: tree.depth,
        parentId,
        isCollapsed: collapsedNodes.has(tree.node.id),
        childrenIds: tree.children.map(c => c.node.id),
      };
      layoutNodes.set(tree.node.id, layoutNode);

      // Create connection to parent
      if (parentId) {
        const parentNode = layoutNodes.get(parentId);
        if (parentNode) {
          connections.push({
            id: `${parentId}-${tree.node.id}`,
            sourceId: parentId,
            targetId: tree.node.id,
            sourceX: parentNode.x + nodeWidth,
            sourceY: parentNode.y + nodeHeight / 2,
            targetX: tree.x,
            targetY: tree.y + nodeHeight / 2,
          });
        }
      }

      // Position children
      if (tree.children.length > 0) {
        const childX = x + horizontalGap;
        let currentY = y;

        // Calculate total height of all children
        const childHeights = tree.children.map(child => calculateSubtreeHeight(child));
        const totalChildrenHeight = childHeights.reduce((sum, h, i) => 
          sum + h + (i > 0 ? verticalGap : 0), 0
        );

        // Center children vertically relative to parent
        currentY = y + (nodeHeight - totalChildrenHeight) / 2;

        tree.children.forEach((child, i) => {
          const childHeight = childHeights[i];
          // Position child at center of its subtree space
          const childY = currentY + (childHeight - nodeHeight) / 2;
          positionTree(child, childX, childY, tree.node.id);
          currentY += childHeight + verticalGap;
        });
      }
    }

    // Build and position the tree
    const trees = buildTree(notes);
    let currentY = rootY;
    
    trees.forEach(tree => {
      const treeHeight = calculateSubtreeHeight(tree);
      positionTree(tree, rootX, currentY, null);
      currentY += treeHeight + verticalGap * 2;
    });

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    layoutNodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    });

    const bounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };

    return {
      nodes: Array.from(layoutNodes.values()),
      connections,
      bounds,
    };
  }, [notes, collapsedNodes, nodeWidth, nodeHeight, horizontalGap, verticalGap, rootX, rootY]);
}

