function gridMap(editor,id, gridSize = 25, gap = 75) {
    
  const module = editor.getModuleFromNodeId(id);
  const data = editor.getNodeFromId(id);
  const pos_x = data.pos_x;
  const pos_y = data.pos_y;

  // Snap to the grid first
  const { x: snappedX, y: snappedY } = snapToGrid(pos_x, pos_y);
  console.log("Snapped to grid:", { x: snappedX, y: snappedY });

  const adjustedPosition = hasOverlap(id, snappedX, snappedY)
    ? avoidOverlap(id, snappedX, snappedY)
    : { x: snappedX, y: snappedY };
  console.log("Adjusted position:", adjustedPosition);

  editor.drawflow.drawflow[module].data[id].pos_x = adjustedPosition.x;
  editor.drawflow.drawflow[module].data[id].pos_y = adjustedPosition.y;
  document.getElementById(`node-${id}`).style.left = adjustedPosition.x + "px";
  document.getElementById(`node-${id}`).style.top = adjustedPosition.y + "px";
  editor.updateConnectionNodes(`node-${id}`);
  function snapToGrid(x, y) {
    const snappedX = Math.round(x / gridSize) * gridSize;
    const snappedY = Math.round(y / gridSize) * gridSize;
    return { x: snappedX, y: snappedY };
  }

  // Function to check if a node overlaps with others
  function hasOverlap(nodeId, x, y) {
    const nodes = editor.drawflow.drawflow[editor.module].data;

    for (const id in nodes) {
      if (id == nodeId) continue;

      const node = nodes[id];
      const nodePosX = node.pos_x;
      const nodePosY = node.pos_y;

      // Get the actual width and height of the node
      const nodeElement = document.getElementById(`node-${id}`);
      const nodeWidth = nodeElement ? nodeElement.offsetWidth : 200;
      const nodeHeight = nodeElement ? nodeElement.offsetHeight : 100;

      if (
        x < nodePosX + nodeWidth + gap &&
        x + nodeWidth + gap > nodePosX &&
        y < nodePosY + nodeHeight + gap &&
        y + nodeHeight + gap > nodePosY
      ) {
        return true; // Overlap detected
      }
    }
    return false; // No overlap
  }

  function avoidOverlap(nodeId, x, y, gap = 75) {
    const nodes = editor.drawflow.drawflow[editor.module].data;

    const directions = [
      { dx: 0, dy: -1 }, // Up
      { dx: 0, dy: 1 }, // Down
      { dx: -1, dy: 0 }, // Left
      { dx: 1, dy: 0 }, // Right
    ];

    const maxSearchSteps = 10; // Maximum number of steps to search for a valid position
    let bestX = x;
    let bestY = y;

    function maintainsExactGap(x, y, gap) {
      for (const id in nodes) {
        if (id == nodeId) continue;

        const node = nodes[id];
        const nodePosX = node.pos_x;
        const nodePosY = node.pos_y;

        const nodeElement = document.getElementById(`node-${id}`);
        const nodeWidth = nodeElement ? nodeElement.offsetWidth : 200;
        const nodeHeight = nodeElement ? nodeElement.offsetHeight : 100;

        if (
          x < nodePosX + nodeWidth + gap &&
          x + nodeWidth + gap > nodePosX &&
          y < nodePosY + nodeHeight + gap &&
          y + nodeHeight + gap > nodePosY
        ) {
          return false;
        }
      }
      return true; // Gap maintained
    }

    for (let step = 1; step <= maxSearchSteps; step++) {
      for (const dir of directions) {
        const newX = x + dir.dx * gap * step;
        const newY = y + dir.dy * gap * step;

        if (maintainsExactGap(newX, newY, gap)) {
          bestX = newX;
          bestY = newY;
          return { x: bestX, y: bestY }; // Exit immediately upon finding a valid position
        }
      }
    }

    return { x: bestX, y: bestY };
  }
}
