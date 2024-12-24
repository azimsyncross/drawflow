<!DOCTYPE html>
<html lang="en">
  <!-- Previous head section remains the same -->
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/drawflow/dist/drawflow.min.css"
    />
    <script src="https://cdn.jsdelivr.net/npm/drawflow/dist/drawflow.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <title>Drawflow Example</title>
  </head>
  <body class="flex">
    <!-- Sidebar -->
    <div class="bg-gray-200 w-[20%] h-[100vh] p-4 flex flex-col items-center">
      <!-- Previous buttons remain the same -->
      <button
        class="bg-blue-500 text-white p-2 rounded-md mb-4 w-full"
        onclick="addCustomNode(2, 1, 'Two Inputs Node')"
      >
        2 inputs node
      </button>
      <button
        class="bg-blue-500 text-white p-2 rounded-md mb-4 w-full"
        onclick="addCustomNode(0, 2, 'Starting Node')"
      >
        Starting node
      </button>
      <button
        class="bg-green-500 text-white p-2 rounded-md mb-4 w-full"
        onclick="addCustomNode(1, 2, 'Processing Node')"
      >
        Processing node (1in, 2out)
      </button>
      <button
        class="bg-purple-500 text-white p-2 rounded-md mb-4 w-full"
        onclick="addCustomNode(2, 2, 'Multi Node')"
      >
        Multi node (2in, 2out)
      </button>

      <!-- Import JSON Section -->
      <div class="mt-4 w-full">
        <label class="block text-gray-700 text-sm font-bold mb-2">
          Import JSON
        </label>
        <input
          type="file"
          id="jsonFileInput"
          accept=".json"
          class="hidden"
          onchange="handleFileSelect(event)"
        />
        <button
          onclick="document.getElementById('jsonFileInput').click()"
          class="bg-yellow-600 text-white p-2 rounded-md w-full mb-4"
        >
          Choose JSON File
        </button>
      </div>

      <!-- Save and Export Controls -->
      <div class="mt-4 flex flex-col gap-2 w-full">
        <button
          class="bg-green-600 text-white p-2 rounded-md w-full"
          onclick="saveToLocalStorage()"
        >
          Save to Local Storage
        </button>
        <button
          class="bg-blue-600 text-white p-2 rounded-md w-full"
          onclick="exportToJson()"
        >
          Export as JSON
        </button>
      </div>

      <!-- Zoom Controls -->
      <div class="mt-4 flex flex-col gap-2 w-full">
        <button
          class="bg-gray-700 text-white p-2 rounded-md w-full"
          onclick="zoomIn()"
        >
          Zoom In (+)
        </button>
        <button
          class="bg-gray-700 text-white p-2 rounded-md w-full"
          onclick="zoomOut()"
        >
          Zoom Out (-)
        </button>
        <button
          class="bg-gray-700 text-white p-2 rounded-md w-full"
          onclick="resetZoom()"
        >
          Reset Zoom (R)
        </button>
      </div>

      <!-- Add this to your sidebar div -->
      <div class="mt-4 flex flex-col gap-2 w-full">
        <button class="bg-gray-700 text-white p-2 rounded-md w-full" onclick="centerCanvas()">
          Center Canvas
        </button>
        <button class="bg-gray-700 text-white p-2 rounded-md w-full" onclick="selectedNodeId && centerOnNode(selectedNodeId)">
          Center on Selected Node
        </button>
      </div>
    </div>

    <!-- Canvas -->
    <div class="w-[80%] h-[100vh]">
      <div id="drawflow" class="w-full h-full"></div>
    </div>

    <script>
      // First, move all function definitions outside of the DOMContentLoaded event
      let editor;
      let selectedNodeId = null;
      let copiedNodeData = null;
      const ZOOM_STEP = 0.1;
      const MIN_ZOOM = 0.1;
      const MAX_ZOOM = 2;
      const STORAGE_KEY = "drawflow-data";

      // Define translate_to function that will be added to editor after initialization
      function initializeTranslateTo(editor) {
          editor.translate_to = function(x, y, zoom) {
              this.canvas_x = x;
              this.canvas_y = y;
              let storedZoom = zoom || this.zoom;
              this.zoom = 1;
              this.precanvas.style.transform = "translate(" + this.canvas_x + "px, " + this.canvas_y + "px) scale(" + storedZoom + ")";
              this.zoom = storedZoom;
              this.zoom_last_value = storedZoom;
              
              // Return the translation values for debugging
              return {
                  x: this.canvas_x,
                  y: this.canvas_y,
                  zoom: this.zoom
              };
          }
      }

      function centerCanvas() {
          if (!editor) return;
          
          // Get canvas dimensions
          const canvasWidth = document.getElementById('drawflow').clientWidth;
          const canvasHeight = document.getElementById('drawflow').clientHeight;
          
          // Get all nodes to calculate the flow bounds
          const nodes = editor?.drawflow?.drawflow?.Home?.data || {};
          
          if (Object.keys(nodes).length === 0) {
              // If no nodes, just center the view
              editor.translate_to(0, 0, editor.zoom);
              return;
          }

          // Calculate bounds of all nodes
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;

          Object.values(nodes).forEach(node => {
              minX = Math.min(minX, node.pos_x);
              minY = Math.min(minY, node.pos_y);
              maxX = Math.max(maxX, node.pos_x + 200); // 200 is approximate node width
              maxY = Math.max(maxY, node.pos_y + 100); // 100 is approximate node height
          });

          // Calculate center of the flow
          const flowWidth = maxX - minX;
          const flowHeight = maxY - minY;
          const flowCenterX = minX + flowWidth / 2;
          const flowCenterY = minY + flowHeight / 2;

          // Calculate translation needed to center the flow
          const translateX = -(flowCenterX - canvasWidth / 2);
          const translateY = -(flowCenterY - canvasHeight / 2);

          // Apply translation
          editor.translate_to(translateX, translateY, editor.zoom);
          
          console.log('Center translation:', { translateX, translateY });
      }

      function centerOnNode(nodeId) {
          if (!editor) return;
          const node = editor.getNodeFromId(nodeId);
          if (!node) return;
          
          const canvasWidth = document.getElementById('drawflow').clientWidth;
          const canvasHeight = document.getElementById('drawflow').clientHeight;
          
          const x = -(node.pos_x - canvasWidth/2 + 100);
          const y = -(node.pos_y - canvasHeight/2 + 50);
          
          editor.translate_to(x, y, editor.zoom);
      }

      // Update the DOMContentLoaded event handler
      document.addEventListener("DOMContentLoaded", () => {
          // Initialize editor
          editor = new Drawflow(document.getElementById("drawflow"));
          
          // Set editor options before starting
          editor.reroute = true;
          editor.reroute_fix_curvature = true;
          editor.curvature = 0.5;
          editor.reroute_curvature_start_end = 0.5;
          editor.reroute_curvature = 0.5;
          editor.reroute_width = 6;
          editor.line_path = 5;
          editor.zoom_max = 1.6;
          editor.zoom_min = 0.5;
          editor.zoom_value = 0.1;
          editor.editor_mode = 'edit';

          // Initialize the editor
          editor.start();
          
          // Add translate_to method to editor
          initializeTranslateTo(editor);

          // Load saved data
          loadFromLocalStorage();

          // Add event listeners
          editor.on('translate', function(transform) {
              console.log('Transform:', transform);
          });

          editor.on('zoom', function(zoom) {
              console.log('Zoom:', zoom);
          });

          editor.on('nodeSelected', function(nodeId) {
              selectedNodeId = nodeId;
              console.log('Node Selected:', nodeId);
          });

          editor.on('nodeUnselected', () => {
              selectedNodeId = null;
              console.log('Node unselected');
          });

          // Add keyboard shortcuts
          document.addEventListener('keydown', (event) => {
              if (event.ctrlKey && event.key === 's') {
                  event.preventDefault();
                  saveToLocalStorage();
              }
              if (event.key === 'c') {
                  centerCanvas();
              }
              if (selectedNodeId && event.key === 'f') {
                  centerOnNode(selectedNodeId);
              }
          });
      });

      // Move all other functions outside DOMContentLoaded
      function addCustomNode(inputs, outputs, nodeName) {
          if (!editor) return;
          const nodeHtml = createNodeHtml(nodeName, inputs, outputs);
          editor.addNode(
              nodeName,
              inputs,
              outputs,
              100 + Math.random() * 200,
              100 + Math.random() * 200,
              "custom-node",
              { value: "" },
              nodeHtml
          );
      }

      function saveToLocalStorage() {
          if (!editor) return;
          const data = editor.export();
          const canvasState = {
              data: data,
              canvas_x: editor.canvas_x,
              canvas_y: editor.canvas_y,
              zoom: editor.zoom
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(canvasState));
          alert("Flow saved to local storage!");
      }

      function loadFromLocalStorage() {
          if (!editor) return;
          const savedData = localStorage.getItem(STORAGE_KEY);
          if (savedData) {
              try {
                  const state = JSON.parse(savedData);
                  editor.clear();
                  editor.import(state.data);
                  
                  setTimeout(() => {
                      if (state.canvas_x !== undefined && state.canvas_y !== undefined) {
                          editor.translate_to(state.canvas_x, state.canvas_y, state.zoom || 1);
                      }
                  }, 100);
              } catch (err) {
                  console.error("Error loading saved data:", err);
              }
          }
      }

      // Helper function to create node HTML
      function createNodeHtml(nodeName, inputs, outputs) {
        return `
          <div class="node-wrapper text-white">
            <div class="node-header text-lg font-bold mb-2">${nodeName}</div>
            <div class="node-content">
              <input type="text" class="border rounded px-2 py-1 w-full mb-2" placeholder="Enter value..."/>
              <div class="text-sm text-white-600">
                Inputs: ${inputs} | Outputs: ${outputs}
              </div>
            </div>
          </div>
        `;
      }

      // Previous zoom functions remain the same
      function zoomIn() {
        const currentZoom = editor.zoom;
        if (currentZoom < MAX_ZOOM) {
          editor.zoom_in();
        }
      }

      function zoomOut() {
        const currentZoom = editor.zoom;
        if (currentZoom > MIN_ZOOM) {
          editor.zoom_out();
        }
      }

      function resetZoom() {
        editor.zoom_reset();
      }

      // New function to handle file import
      function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
          try {
            const jsonData = JSON.parse(e.target.result);
            editor.clear(); // Clear existing diagram
            editor.import(jsonData);
            alert("Flow imported successfully!");
          } catch (error) {
            console.error("Error importing JSON:", error);
            alert(
              "Error importing JSON file. Please make sure the file is valid."
            );
          }
        };
        reader.onerror = function () {
          alert("Error reading file");
        };
        reader.readAsText(file);

        // Reset the input so the same file can be selected again
        event.target.value = "";
      }

      function exportToJson() {
        const data = editor.export();
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "flowchart.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    </script>

    <style>
       #drawflow {
        position: relative;
        width: 100%;
        height: 100%;
        background-size: 25px 25px;
        background-image: 
          linear-gradient(to right, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
      }

      .drawflow .drawflow-node {
        background: #2d3436;
        border: 2px solid #2d3436;
        border-radius: 8px;
        min-width: 200px;
        position: absolute;
        z-index: 2;
      }

      .drawflow .connection {
        position: absolute;
        pointer-events: none;
        z-index: 1;
      }

      .drawflow .connection .main-path {
        fill: none;
        stroke-width: 5px;
        stroke: #4ea9ff;
      }
    </style>
  </body>
</html>
