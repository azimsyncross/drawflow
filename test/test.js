let $scope;
var newOrder = [];
let getProcessFlow = false;
self.onInit = function() {
	self.ctx.ngZone.run(function() {
		init();
		initializeTranslateTo(self.ctx.$scope.editor); 
        toggling()
		self.ctx.detectChanges(true);
	});

};


function toggling(){
    $scope = self.ctx.$scope;
    $scope.isPanelVisible = false;
    $scope.togglePanel=function() {
    $scope.isPanelVisible = !$scope.isPanelVisible; 
    // console.log("toggling working fine")
     }
}


// add translate_to method in editor

function initializeTranslateTo(editor) {
    editor.translate_to = function(x, y, zoom) {
        // console.log("canvas translate_to", x, y, zoom);
        
        // Store the target coordinates and zoom
        this.canvas_x = x;
        this.canvas_y = y;
        let storedZoom = zoom || this.zoom;
        
        // Apply the transformation with proper zoom scaling
        this.precanvas.style.transform = `translate(${x}px, ${y}px) scale(${storedZoom})`;
        
        // Update zoom-related properties
        this.zoom = storedZoom;
        this.zoom_last_value = storedZoom;
        
        return {
            x: this.canvas_x,
            y: this.canvas_y,
            zoom: this.zoom
        };
    };
}

function resetToTopLeft(editor) {
    if (!editor) return;
    
    // Get all nodes
    const nodes = editor?.drawflow?.drawflow?.Home?.data || editor?.drawflow?.Home?.data || {};
    
    if (Object.keys(nodes).length === 0) {
        editor.translate_to(0, 0, editor.zoom);
        return;
    }
    
    // Calculate bounds
    let minX = Infinity;
    let minY = Infinity;
    
    Object.values(nodes).forEach(node => {
        minX = Math.min(minX, node.pos_x);
        minY = Math.min(minY, node.pos_y);
    });
    
    // Add margins
    const marginX = 50;
    const marginY = 80;
    
    // Adjust translation based on current zoom level
    const zoomAdjustedX = (-minX + marginX);
    const zoomAdjustedY = (-minY + marginY);
    
    // Apply the transformation
    editor.translate_to(zoomAdjustedX, zoomAdjustedY,1);
    
    // console.log("reset editor", {
    //     minX,
    //     minY,
    //     zoom: editor.zoom,
    //     adjustedX: zoomAdjustedX,
    //     adjustedY: zoomAdjustedY
    // });
    
    return editor;
}

// grid function for avoid node overlapping
function gridMap(editor,id, gridSize = 25, gap = 25) {
    
  const module = editor.getModuleFromNodeId(id);
  const data = editor.getNodeFromId(id);
  const pos_x = data.pos_x;
  const pos_y = data.pos_y;

  // Snap to the grid first
  const { x: snappedX, y: snappedY } = snapToGrid(pos_x, pos_y);
//   console.log("Snapped to grid:", { x: snappedX, y: snappedY });

  const adjustedPosition = hasOverlap(id, snappedX, snappedY)
    ? avoidOverlap(id, snappedX, snappedY)
    : { x: snappedX, y: snappedY };
//   console.log("Adjusted position:", adjustedPosition);

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

function init() {
	$('#orderId').val('');
	$('#styleNo').val('');
	$('#process').val('');
	var qcSelected = false;
	let http = {
	method: self.ctx.http,
	baseUrl: "/pesapi/",
	config: {
		headers: {
			"Content-Type": "application/json",
			Prefer: "resolution=merge-duplicates",
			"X-Authorization": "Bearer " + localStorage.getItem("jwt_token"),
		},
	},
    };
	$scope = self.ctx.$scope;
	customDialog = self.ctx.$injector.get(self.ctx.servicesMap.get("customDialog"));
	$scope.UnassignedPESDeviceList = [];
	$scope.WorkerDeviceList = [];
	$scope.qcDeviceList = [];
	$scope.allowDropFlag = false;
	$scope.pes_Devices = [];
	$scope.lineDetails = {};
	$scope.assignedPESDeviceList = []
    $scope.stylePartsOfLine = []
	$scope.unassignedStyleParts = []
	$scope.assignedStyleParts = []
	$scope.initialAssignedPES = []
	$scope.initialAssignedWorkers = []
    $scope.allStyleWisePESDevices = []
    $scope.allPESDevices = []
    $scope.isConnectionSelected = false
    $scope.process_list = [];
    $scope.changedPESList = [];
    
    
    $scope.resetToTopLeftfunc=function() {
        resetToTopLeft($scope.editor)
    }

    
    
    let clipboardData = null;
    
    
    //copying node with button
    function addCopyNodeListener(nodeId) {
        $('.copyNode').off('click').on('click', function (e) {
            e.stopPropagation();
            copySelectedNode();
           
        });
    }

    

    
   function copySelectedNode() {
        if ($scope.selectedNodeData) {
            // Deep clone the selected node data
            clipboardData = JSON.parse(JSON.stringify($scope.selectedNodeData));
            // console.log("Node copied:", clipboardData);
            self.ctx.showToast("success", "Node copied to clipboard", 2000, "top", "start", self.ctx.$scope.toastTargetId);
        } else {
            self.ctx.showToast("warning", "No node selected", 2000, "top", "start", self.ctx.$scope.toastTargetId);
        }
    }

    function pasteNode() {
    if (!clipboardData) {
        // console.log("Clipboard data is empty. Cannot paste.");
        self.ctx.showToast("warning", "Nothing to paste", 2000, "top", "start", self.ctx.$scope.toastTargetId);
        return;
    }

    try {
        // Clone the clipboard data
        const newNodeData = JSON.parse(JSON.stringify(clipboardData));

        // Modify `newNodeData.data` as per requirements
        if (newNodeData.data) {
            if (newNodeData.data.ETS_List) {
                newNodeData.data.ETS_List = [];
            }
            if (newNodeData.data.PES_Id) {
                newNodeData.data.PES_Id = {};
            }
            if (newNodeData.data.workerList) {
                newNodeData.data.workerList = [];
            }
        }
        
        // console.log("new node data:",newNodeData.data)
        
        self.ctx.ngZone.run(() => {
            // console.log("Attempting to add node to DrawFlow...",newNodeData.data);
            // Use the existing addNodeToDrawFlow function
            $scope.addNodeToDrawFlow(
                newNodeData.name,
                newNodeData.pos_x,
                newNodeData.pos_y,
                newNodeData.data?.ProcessName || null,
                newNodeData.data?.child_groups?.join(",") || null,
                newNodeData.data?.sam || null,
                newNodeData.data?.target || null,
                newNodeData.data
            );
            
            // console.log("Node added successfully to DrawFlow.");
            
            self.ctx.showToast("success", "Node pasted successfully", 2000, "top", "start", self.ctx.$scope.toastTargetId);
        });
    } catch (error) {
        console.error("Error occurred while pasting node:", error);
        self.ctx.showToast("error", "Failed to paste node", 2000, "top", "start", self.ctx.$scope.toastTargetId);
    }
}

    


 







 
    
    
    
    
    
	function addWorkerListener(){
		$(".add-worker").unbind("click");
		$(".add-worker").click(function() {
			var clickedBtnID = $(this).attr("id");
			$scope.clickedETS = clickedBtnID;
			html = `
               <div aria-label="Info" style="width: 500px">
                <mat-toolbar fxLayout="row" color="primary" >
                    <div>Add Workers</div>
                    <span fxFlex></span>
                    <button mat-icon-button (click)="close()">
                        <mat-icon>close</mat-icon>
                    </button>
                </mat-toolbar>
                <div mat-dialog-content>
                    <mat-form-field class="example-chip-list" appearance="fill" style='width: 100%'>
          <mat-label>Select Worker</mat-label>
          <mat-chip-list #chipList aria-label="Worker selection">
            <mat-chip
              *ngFor="let worker of workers; let i = index"
              [selectable]="selectable"
              [removable]="removable"
              (removed)="remove(i)">
              {{worker.label}}
              <mat-icon matChipRemove *ngIf="removable">cancel</mat-icon>
            </mat-chip>
            <input
              placeholder="Workers..."
              [ngModel]="workerInput"
              (input)="FilterData($event)"
              [matAutocomplete]="auto"
              [matChipInputFor]="chipList"
              id='worker_input' />
          </mat-chip-list>
          <mat-autocomplete #auto="matAutocomplete" (optionSelected)="selected($event)">
            <mat-option *ngFor="let worker of filteredWorkers" [value]="worker">
              {{worker.label}}
            </mat-option>
          </mat-autocomplete>
        </mat-form-field>
        
                </div>
                <button style='    margin-bottom: 20px;margin-left: 20px;'  mat-raised-button (click)="save()">Save</button>
            </div>`;
			data = {};
			data.html = html;
// 			data.allWorkers = $scope.allWorkers;
			customDialog.customDialog(html, AddWorkerModalController, data).subscribe(function(res) {
				if(res) {}
			});
		});
	};
	function addEtsListener(){
	    $(".button-ets").unbind("click");
		$(".button-ets").click(function() {
			html = `
              <div aria-label="Info" style="width: 500px">
                <mat-toolbar fxLayout="row" color="primary" >
                    <div>Add ETS</div>
                    <span fxFlex></span>
                    <button mat-icon-button (click)="close()">
                        <mat-icon>close</mat-icon>
                    </button>
                </mat-toolbar>
                <div mat-dialog-content>
                    <mat-form-field class="example-chip-list" appearance="fill" style='width: 100%'>
          <mat-label>Select ETS</mat-label>
          <mat-chip-list #chipList aria-label="ETS selection">
            <mat-chip
              *ngFor="let pes_Device of pes_Devices; let i=index"
              [selectable]="selectable"
              [removable]="removable"
              (removed)="remove(i)">
              {{pes_Device.name}}
              <mat-icon matChipRemove *ngIf="removable">cancel</mat-icon>
            </mat-chip>
            <input
            type="text"
              placeholder="New ETS..."
              [ngModel]="pes_DeviceInput"
              (input)="FilterData($event)"
              [matAutocomplete]="auto"
              [matChipInputFor]="chipList"
              id='ets_input' />
          </mat-chip-list>
          <mat-autocomplete #auto="matAutocomplete" (optionSelected)="selected($event)">
            <mat-option *ngFor="let pes_Device of filterdUnassignedPESDeviceList" [value]="pes_Device">
              {{ pes_Device.line_no ? pes_Device.name + ' ('+ pes_Device.line_no + ')' : pes_Device.name }}
            </mat-option>
          </mat-autocomplete>
        </mat-form-field>
        
                </div>
                <button style='    margin-bottom: 20px;margin-left: 20px;'  mat-raised-button (click)="save()">Save</button>
            </div>`;
			data = {};
			data.html = html;
			customDialog.customDialog(html, addPESModalController, data).subscribe(function(res) {
				if(res) {}
			});
		});
	}
	function addProcessListener(){
	    $(".editProcessName").unbind("click");
		$(".editProcessName").click(function() {
			html = `
              <div aria-label="Info" style="width: 500px">
                <mat-toolbar fxLayout="row" color="primary" >
                    <div>Add Process</div>
                    <span fxFlex></span>
                    <button mat-icon-button (click)="close()">
                        <mat-icon>close</mat-icon>
                    </button>
                </mat-toolbar>
                <div mat-dialog-content>
                    <mat-form-field class="example-chip-list" appearance="fill" style='width: 100%'>
          <mat-label>Select Process</mat-label>
          <mat-chip-list #chipList aria-label="Process selection">
            <mat-chip
              *ngFor="let pes_Device of selectedProcess"
              [selectable]="selectable"
              [removable]="removable"
              (removed)="remove(pes_Device)">
              {{pes_Device.name}}
              <mat-icon matChipRemove *ngIf="removable">cancel</mat-icon>
            </mat-chip>
            <input
              placeholder="Process Name..."
              [ngModel]="pes_DeviceInput"
              (input)="FilterData($event)"
              [matAutocomplete]="auto"
              [matChipInputFor]="chipList"
              id='process_input'/>
          </mat-chip-list>
          <mat-autocomplete #auto="matAutocomplete" (optionSelected)="selected($event)">
            <mat-option *ngFor="let pes_Device of filteredProcessList" [value]="pes_Device">
              {{pes_Device.name}}
            </mat-option>
          </mat-autocomplete>
        </mat-form-field>
        
                </div>
                <button style='    margin-bottom: 20px;margin-left: 20px;'  mat-raised-button (click)="save()">Save</button>
            </div>`;
			data = {};
			data.html = html;
			customDialog.customDialog(html, addProcessModalController, data).subscribe(function(res) {
				if(res) {}
			});
		});
	}
	function addStylePartListener() {
		$(".add-group").unbind("click");
		$(".add-group").click(function() {
			html = `
              <div aria-label="Info" style="width: 500px">
                <mat-toolbar fxLayout="row" color="primary" >
                    <div>Add Style Part</div>
                    <span fxFlex></span>
                    <button mat-icon-button (click)="close()">
                        <mat-icon>close</mat-icon>
                    </button>
                </mat-toolbar>
                <div mat-dialog-content>
                    <mat-form-field class="example-chip-list" appearance="fill" style='width: 100%'>
          <mat-label>Select style part</mat-label>
          <mat-chip-list #chipList aria-label="Style part selection">
            <mat-chip
              *ngFor="let stylePart of stylePartsOfNode;index as i"
              [selectable]="selectable"
              [removable]="removable"
              (removed)="remove(i, stylePart)">
              {{stylePart.name}}
              <mat-icon matChipRemove *ngIf="removable">cancel</mat-icon>
            </mat-chip>
            <input
            type="text"
              placeholder="New style parts..."
              [ngModel]="groupInput"
              (input)="FilterData($event)"
              [matAutocomplete]="auto"
              [matChipInputFor]="chipList"
              id='style_part_input'
              />
          </mat-chip-list>
          <mat-autocomplete #auto="matAutocomplete" (optionSelected)="selected($event)">
            <mat-option  *ngFor="let part of  stylePartsOptions" [value]="part">
              {{part.name}}
            </mat-option>
          </mat-autocomplete>
        </mat-form-field>

  <mat-checkbox *ngIf="processName == 'style_part_process'" [(ngModel)]="isMiddleFeedingProcess">Middle Feeding Process</mat-checkbox> 

        
        <mat-form-field class="example-chip-list" *ngIf="isMiddleFeedingProcess" appearance="fill" style='width: 100%'>
          <mat-label>Select feeding bundles</mat-label>
          <mat-chip-list #chipList aria-label="Feeding bundle selection">
            <mat-chip
              *ngFor="let stylePart of feedingBundlesOfNode;index as i"
              [selectable]="selectable"
              [removable]="removable"
              (removed)="removeFeedingBunlde(i, stylePart)">
              {{stylePart.name}}
              <mat-icon matChipRemove *ngIf="removable">cancel</mat-icon>
            </mat-chip>
            <input
            type="text"
              placeholder="New feeding bunldes..."
              (input)="FilterDataFeedingBunlde($event)"
              [matAutocomplete]="auto"
              [matChipInputFor]="chipList"
              id='style_part_input_feeding'
              />
          </mat-chip-list>
          <mat-autocomplete #auto="matAutocomplete" (optionSelected)="selectedFeedingBundle($event)">
            <mat-option  *ngFor="let part of  feedingStylePartsOptions" [value]="part">
              {{part.name}}
            </mat-option>
          </mat-autocomplete>
        </mat-form-field>
        
                </div>
                <button style='    margin-bottom: 20px;margin-left: 20px;'  mat-raised-button (click)="save()">Save</button>
            </div>`;
			data = {};
			data.html = html;
			customDialog.customDialog(html, addStylePartModalController, data).subscribe(function(res) {
				if(res) {}
			});
		});
	}
	$scope.buttonListener = function() {
		addWorkerListener();
		addEtsListener();
		addProcessListener();
		addStylePartListener();
	};
	
	$scope.get_processFlow = function() {
	    getProcessFlow = true;
		$scope.allInitialSelectedWorkers = [];
		$scope.editor.canvas_x = 0;
		$scope.editor.canvas_y = 0;
		$scope.editor.pos_x = 0;
		$scope.editor.pos_y = 0;
		$scope.editor.pos_x_start = 0;
		$scope.editor.pos_y_start = 0;
		$scope.editor.prevDiff = 0;
		
		
		
		
		
		

			$scope.allowDropFlag = true;
			$scope.editor.clear();
			let url = http.baseUrl + "_pes_process_flow?order_id=eq." + self.ctx.$scope.lineDetails.order_id + "&style_no=eq." + self.ctx.$scope.lineDetails.style_no + "&line_no=eq." + self.ctx.$scope.lineDetails.line_no;
			url = url.toString().replace(/#/g, '%23')
			http.method.get(url, http.config).subscribe(function(r) {
				if(r.length && r[0].flow_data && Object.keys(r[0].flow_data.drawflow.Home.data).length) {
					var drawflows = $("#drawflow").find(".drawflow");
					if(drawflows != null && drawflows.length > 0) {
						$("#drawflow").find(".drawflow").remove();
					}
					$scope.drawFlowData = {...r[0].flow_data.drawflow.Home.data};
					$scope.editor.drawflow = r[0].flow_data;
					$scope.editor.zoom = 1;
					$scope.editor.start();
					$scope.buttonListener();
					$scope.setAssignedStyleParts(r[0].flow_data.drawflow.Home.data);
					$scope.setInitialAssignedPES(r[0].flow_data.drawflow.Home.data);
					$scope.setInitialAssignedWorkers(r[0].flow_data.drawflow.Home.data)
					$scope.setPartCheckProperty(r[0].flow_data.drawflow.Home.data)
					resetToTopLeft($scope.editor)
				} else {
				    let styleId = $scope.ProductionLineStyleId.id
				    $scope.generateFlowFromStyleProcesses(styleId)
				    $scope.setAssignedStyleParts([])
				// 	self.ctx.showToast("error", "No Process Flow available", 5000, "top", "start", self.ctx.$scope.toastTargetId);
				}
			}, function(e) {
			    $scope.setAssignedStyleParts([])
				$scope.loading = false;
				self.ctx.showToast("error", "Getting Process Flow failed", 5000, "top", "start", self.ctx.$scope.toastTargetId);
			});
	};
	
	$scope.generateFlowFromStyleProcesses = function(styleId){
	    $scope.getAllProcessesFromStyle(styleId).subscribe(result => {
	        if(result && result.length){
	           
	           $scope.drawNodesFromProcessList(result)
	        }else{
	           self.ctx.showToast("error", "No Process Found", 5000, "top", "start", self.ctx.$scope.toastTargetId);
	        }
	    })
	}
	$scope.drawNodesFromProcessList = function(process_list){
        let position_X = 0;
        let position_Y = 0;
        let lastHighestParallelProcessCount = 1;
        $scope.process_list = process_list;
	    $scope.process_list.forEach((process,i) =>{
	        if(process.station_type == 'Feeding'){
                position_X = 600
                position_Y = position_Y + (i==0 ? 150 :  (lastHighestParallelProcessCount * 400))
                lastHighestParallelProcessCount = 1
                for(let j=0; j<process.lay_mp; j++){
                    position_Y = position_Y + (j==0 ? 0 : 400) 
	                $scope.addNodeToDrawFlow('start_process', position_X, position_Y, process.name, process.feeding_parts, process.min_item_completion_time, process.max_item_completion_time, process.learning_rate,process.sam)
                }
	        }else if(process.station_type == 'Middle Feeding'){
                position_X = position_X + 350
                    lastHighestParallelProcessCount = process.lay_mp > lastHighestParallelProcessCount ? process.lay_mp : lastHighestParallelProcessCount;

                for(let j=0; j<process.lay_mp; j++){
                position_Y = position_Y + (j==0 ? $scope.process_list[i-1]['lay_mp'] > 1 ? (-400 * ($scope.process_list[i-1]['lay_mp']-1)) : 0 : 400)
	            $scope.addNodeToDrawFlow('style_part_process', position_X, position_Y, process.name, process.feeding_parts, process.min_item_completion_time, process.max_item_completion_time, process.learning_rate,process.sam)
                }
	        }else{
                position_X = position_X + 350
                    lastHighestParallelProcessCount = process.lay_mp > lastHighestParallelProcessCount ? process.lay_mp : lastHighestParallelProcessCount;
                 for(let j=0; j<process.lay_mp; j++){
                    position_Y = position_Y + (j==0 ? $scope.process_list[i-1]['lay_mp'] > 1 ? (-400 * ($scope.process_list[i-1]['lay_mp']-1)) : 0 : 400)
                    if(process.station_type == 'QC'){
                        $scope.addNodeToDrawFlow('iron_qc', position_X, position_Y, process.name, process.feeding_parts, process.min_item_completion_time, process.max_item_completion_time, process.learning_rate,process.sam)
                    }else if(process.station_type == 'Intermediate QC'){
                        $scope.addNodeToDrawFlow('intermediate_qc', position_X, position_Y, process.name, process.feeding_parts, process.min_item_completion_time, process.max_item_completion_time, process.learning_rate,process.sam)
                    }else{
                        $scope.addNodeToDrawFlow('middle_process', position_X, position_Y, process.name, process.feeding_parts, process.min_item_completion_time, process.max_item_completion_time, process.learning_rate,process.sam)
                    }

                 }
	        }

	    })
	}
	$scope.getAllProcessesFromStyle = function(styleId){
	    return http.method.get(http.baseUrl+`_process_details?style_id=eq.${styleId}`, http.config)
	}
	$scope.getToFlowETSFromNode = function(node) {
		var toflow = [];
		if($scope.editor.export().drawflow.Home.data[node].outputs.output_1 != null) {
			$scope.editor.export().drawflow.Home.data[node].outputs.output_1.connections.forEach( 
				(toFlowNode) => {
					var etsList = $scope.getETSFromNode(toFlowNode.node).map(ets => ets.name);
					etsList.forEach((item) => {
						toflow.push(styleWisePesNameGenerator(item));
					});
				});
		}
		return toflow;
	};
	
	$scope.getFromFlowETSFromNode = function(node) { 
		var fromflow = [];
		let currentNode = $scope.editor.export().drawflow.Home.data[node];
		let join_nodes 
		if(currentNode.data.related_nodes){
		     join_nodes= getJoinNodesFromRelatedNodes(node)
		}
		if(currentNode.inputs.input_1 != null) {
			currentNode.inputs.input_1.connections.forEach(
				(fromFlowNode) => {
					var etsList = $scope.getETSFromNode(fromFlowNode.node).map(ets => ets.name);
					etsList.forEach((item) => {
						var fromFlowObj = {};
						fromFlowObj["ets"] =  styleWisePesNameGenerator(item)
						fromFlowObj["status"] = null;
						fromFlowObj["join_pes"] = join_nodes ? join_nodes[fromFlowNode.node] ? getPesListFromNodeList(join_nodes[fromFlowNode.node]) : [] : [];
						fromflow.push(fromFlowObj);
					});
				});
		}
		
		if(currentNode.data && currentNode.data.middle_feeding_bundles){
		    let middleFeedingRelatedbundels;
		    currentNode.data.middle_feeding_bundles.forEach(item =>{
		        middleFeedingRelatedbundels = getSectionNodes(item.name, currentNode.data.related_nodes)
		        middleFeedingRelatedbundels = getPesListFromNodeList(middleFeedingRelatedbundels)
		        fromflow.push({ets: 'initial-pes-'+item.name, status: null, join_pes: middleFeedingRelatedbundels ? middleFeedingRelatedbundels : []})
		    })
		}
		
		return fromflow;
	};
	
	let getPesListFromNodeList = function (nodes){
	    let pesList = []
	    let flowData = $scope.editor.export().drawflow.Home.data;
	    let nodePesList = []
	    let parallelPes = []
	    for(let node of nodes){
	        if(Array.isArray(node)){
	            parallelPes = []
	            for(let nestedNode of node){
	                if($scope.editor.export().drawflow.Home.data[nestedNode]){
	                    nodePesList = $scope.getETSFromNode(nestedNode)
            	        if(nodePesList.length){
            	            parallelPes.push(styleWisePesNameGenerator(nodePesList[0].name))
            	        }
	                }else{
	                    parallelPes.push('initial-pes-'+nestedNode)
	                }

	            }
	            pesList.push(parallelPes)
	        }else{
	            if($scope.editor.export().drawflow.Home.data[node]){
	                nodePesList = $scope.getETSFromNode(node)
        	        if(nodePesList.length){
        	            pesList.push(styleWisePesNameGenerator(nodePesList[0].name))
        	        }
	            }else{
	                 pesList.push('initial-pes-'+node)
	            }

	        }
	    }
	    return pesList;
	}

	$scope.getETSFromNode = function(node) {
	    let selectedETS = [];
	    let drawFlowNode = $scope.editor.export().drawflow.Home.data[node];
	    
		if(drawFlowNode != undefined && drawFlowNode.data != null && drawFlowNode.data.ETS_List[0]) {
			selectedETS = [{id: drawFlowNode.data.PES_Id, name: drawFlowNode.data.ETS_List[0] }];
		}
		return selectedETS;
	};
	let getJoinNodesFromRelatedNodes = function(node){
	    let currentNode = $scope.editor.export().drawflow.Home.data[node]
	    let relatedNodes = currentNode.data.related_nodes;
	    let joinNodes = {}
	    let sectionNode;
	    currentNode.inputs.input_1.connections.forEach(
				(fromFlowNode) => {
				    sectionNode = getSectionNodes(fromFlowNode.node, relatedNodes);
				    // if(sectionNode){
				        joinNodes[fromFlowNode.node] = sectionNode;
				    // }
				});
	    return joinNodes			
	}
	
	let getSectionNodes = function(currentNode, related_nodes){
	    for(let key in related_nodes){
	        if(findNode(currentNode, related_nodes[key])){
	            return related_nodes[key].filter(relNode => !relNode.includes(currentNode)).map(element => {
	                if(element.length == 1){
	                    return element[0];
	                }else{
	                    return element;
	                }
	            });
	        }
	    }
	    
	}
	
	let findNode = function(currentNode, currentSectionNodes){
	    let found = false
        for(let i = 0; i < currentSectionNodes.length; i++) {
          const index = currentSectionNodes[i].indexOf(currentNode);
          if (index !== -1) {
            // currentSectionNodes[i].splice(index, 1); // Remove directly using splice
            found = true
            break;
          }
        }
        return found;
	}
	getWorkersByNodeId = function(nodeId){
	    let selectedWorkers = [];
	    let drawFlowNode = $scope.editor.export().drawflow.Home.data[nodeId];
		if(drawFlowNode && drawFlowNode.data  && drawFlowNode.data.workerList[0] && drawFlowNode.data.workerList[0].length > 0) {
			selectedWorkers = drawFlowNode.data.workerList[0].map(worker => {return {id: worker.id, label: worker.label, name: worker.worker_id}})
		}
		return selectedWorkers;
	}
	
    function getStylePartFromNode(node) {
        let drowflowNodeData = $scope.editor.export().drawflow.Home.data[node]
		let selectedChildGroup = [];
		if(drowflowNodeData && drowflowNodeData.data.child_groups) {
			selectedChildGroup = drowflowNodeData.data.child_groups.map(child => {return {name: child}});
		}
		return selectedChildGroup;
	}



	$scope.setAssignedStyleParts = function(nodes) {
		for(let key in nodes){
		  if(nodes[key].data.child_groups){
		    $scope.assignedStyleParts = $scope.assignedStyleParts.concat(nodes[key].data.child_groups)
		  }
		}
		let assignedStylePartsNames =  $scope.assignedStyleParts.map(style => style.name)
		if(assignedStylePartsNames.length){
		    $scope.unassignedStyleParts = $scope.stylePartsOfLine.filter(style => !assignedStylePartsNames.includes(style.name))
		}else{
		    $scope.unassignedStyleParts = $scope.stylePartsOfLine
		}
	};
	
	$scope.setInitialAssignedPES = function(drawFlowData){
	    for(let key in drawFlowData){
	        if(drawFlowData[key].data.ETS_List.length){
	            $scope.initialAssignedPES.push({name: drawFlowData[key].data.ETS_List[0], id: drawFlowData[key].data.PES_Id})
	        }
	    }
	}
	
    $scope.setInitialAssignedWorkers = function(drawFlowData){
		for(let key in drawFlowData){
	        if(drawFlowData[key].data.workerList && drawFlowData[key].data.workerList.length && drawFlowData[key].data.workerList[0].length){
	            for(let worker of drawFlowData[key].data.workerList[0]){
	                if($scope.initialAssignedWorkers.findIndex(assignedWorker => assignedWorker.name === worker.worker_id) === -1){
	                    	$scope.initialAssignedWorkers.push({name: worker.worker_id, id: worker.id})
	                }
	            }
	        }
	    }   
	}

	function attributeDataConstruct(dataobj) {
		var attributeDataArray = []
		for(var Data in dataobj) {
			obj = {
				key: Data,
				value: dataobj[Data],
			}
			attributeDataArray.push(obj);
		}
		return attributeDataArray;
	}

	function saveRelationData(FromEntityId, ToEntityId) {
	    let EntityRelation = {
			"additionalInfo": "",
			"from": FromEntityId,
			"to": ToEntityId,
			"type": "Contains",
			"typeGroup": "COMMON"
		}
	    return self.ctx.entityRelationService.saveRelation(EntityRelation)
	}


    function deleteRelationData(FromEntityId, ToEntityId) {
        return self.ctx.entityRelationService.deleteRelation(FromEntityId, "Contains", ToEntityId);
	}

    function saveAttributeData(attributeData, deviceId) {
        return self.ctx.attributeService.saveEntityAttributes(deviceId, "SERVER_SCOPE", attributeData)
	}
	
	function saveAttributeDataOfPes(attributeData, data){
	    let observables = []
	   // let mainPesAttributes = attributeData.filter(item => item.key != 'from_flow' && item.key != 'to_flow' && item.key != 'to_flow')
        let attributeObservable = new rxjs.Observable(subscriber => {
            saveAttributeData(attributeData, data.PES_Id).subscribe(result => {
                subscriber.next(result)
            }, error => {
                subscriber.error(error)
            })
        })
        
        let createDeviceObservable = new rxjs.Observable(subscriber => {
            createOrSaveStyleOrderWisePes(attributeData, data).subscribe(result => {
                subscriber.next(result)
            }, error => {
                subscriber.error(error)
            })
        })
        observables.push(attributeObservable)
        observables.push(createDeviceObservable)
	    return rxjs.combineLatest(observables);
	}
	
	function createDevice(device){
        return http.method.post('/pesapi/createDevice', device, http.config)
    }
    function updateDevice(id,device){
        return http.method.patch('/pesapi/device?id=eq.'+id, device, http.config)
    }
	
	function createOrSaveStyleOrderWisePes(attributeData, data){
	   
	    let styleWisePesName =   styleWisePesNameGenerator(data.ETS_List[0]);
	   
	    let existingPES = self.ctx.$scope.allStyleWisePESDevices.find(item => item.name === styleWisePesName)
	   // console.log("existingPES", existingPES, self.ctx.$scope.allStyleWisePESDevices, styleWisePesName)
	    if(existingPES){
	        return new rxjs.Observable(subscriber => {
	           saveAttributeData(attributeData, existingPES.id).subscribe(res =>{
                    subscriber.next(res)
                })
	        })
	    }else{
	       return new rxjs.Observable(subscriber => {
            //   self.ctx.deviceService.saveDevice(device).subscribe(result =>{
            let device = {
                deviceType: 'Style Wise PES',
                data: {
                        [styleWisePesName] :{}
                }
            }
            createDevice(device).subscribe((deviceResponse) => {
                updateDevice(deviceResponse.id.id, {label: data.ETS_List[0]}).subscribe(updatedDevice =>{
                    saveAttributeData(attributeData, deviceResponse.id).subscribe(res =>{
                        subscriber.next(res)
                    })
	            })
	           self.ctx.$scope.allStyleWisePESDevices.push({id: deviceResponse.id, name: deviceResponse.name, label: deviceResponse.label}) 
	           })
	       })
	        
	    }
 
	}

	$scope.saveFlow = async function() {
	    
	    // Call resetToTopLeft immediately
        resetToTopLeft($scope.editor);

 
	   
	    setProcessInfoOnFlowData()
	    
	    let flows = $scope.editor.export();
	    console.log("Flowwwwwwwwwwwwwwwwwwwwwwwwwwww", flows)
	   
		let flowData = flows.drawflow.Home.data;
		
		if (!$scope.checkvalidation(flowData)) {
            $scope.loading = false;  // Ensure loading state is reset
            return;
        }

		
		console.log(flowData)
		let pesServerAttributes = {}
		let process_flow_data = {}
	    $scope.loading = true;
	    process_flow_data.flow_data = flows;
		process_flow_data.process_flow_id = $("#orderId").val() + "_" + $("#styleNo").val() + "_" + $("#process").val();
		 localStorage.setItem(process_flow_data.process_flow_id, JSON.stringify(process_flow_data.flow_data))
		process_flow_data.order_id = $("#orderId").val();
		process_flow_data.style_no = $("#styleNo").val();
		process_flow_data.line_no = $("#process").val();
		http.method.post(http.baseUrl + "_pes_process_flow?on_conflict=process_flow_id", process_flow_data, http.config).subscribe(response => {
		      
		  //   console.log(flowData)

		    saveFlowData(flowData)
		}, error => {
		    self.ctx.showToast("error", "Fail to save flow data ", 5000, "top", "start", self.ctx.$scope.toastTargetId);
		});
	    
	}
	
	$scope.checkvalidation = function(dataObj) {
    console.log(dataObj);
    let hasValidationError = false;

    for (const key in dataObj) {
        const processName = dataObj[key]?.data?.ProcessName?.trim();
        const hasSamKey = 'sam' in dataObj[key]?.data;
        const samValue = hasSamKey ? parseFloat(dataObj[key]?.data?.sam) : null;
        const nodeId = `#node-${dataObj[key]?.id}`;
        const nodeElement = $(nodeId);

        // Reset any existing error styles
        nodeElement.css({
            'border': '',
            'box-shadow': ''
        });

        // Check if Process Name is missing
        if (!processName) {
            console.error("Process Name is missing");
            nodeElement.css({
                'border': '2px solid red',
                'box-shadow': '0 0 10px red'
            });
            hasValidationError = true;
        }

        // Check if samValue is missing, not a number, or not a positive number
        if (hasSamKey && (!samValue || isNaN(samValue) || samValue <= 0)) {
            console.error("SAM value must be required and a positive number");
            nodeElement.css({
                'border': '2px solid red',
                'box-shadow': '0 0 10px red'
            });
            hasValidationError = true;
        }
    }

    if (hasValidationError) {
        self.ctx.showToast(
            "error", 
            "Fail to save Flow data: Please correct the highlighted nodes.", 
            5000, 
            "top", 
            "start", 
            self.ctx.$scope.toastTargetId
        );
        return false;  // Return false if any validation errors are present
    }

    return true;  // Return true if validation succeeds
};

	
// 	$scope.checkvalidation = function(dataObj) {
//     console.log(dataObj);
//     for (const key in dataObj) {
//         const processName = dataObj[key]?.data?.ProcessName?.trim();
//         const hasSamKey = 'sam' in dataObj[key]?.data;
//         const samValue = hasSamKey ? parseFloat(dataObj[key]?.data?.sam) : null;
//         const nodeId = `#node-${dataObj[key]?.id}`;
//         const nodeElement = $(nodeId);

//         // Reset any existing error styles
//         nodeElement.css({
//             'border': '',
//             'box-shadow': ''
//         });

//         // Check if Process Name is missing
//         if (!processName) {
//             console.error("Process Name is missing");
//             nodeElement.css({
//                 'border': '2px solid red',
//                 'box-shadow': '0 0 10px red'
//             });
//             self.ctx.showToast(
//                 "error", 
//                 "Fail to save Flow data: Process Name is missing", 
//                 5000, 
//                 "top", 
//                 "start", 
//                 self.ctx.$scope.toastTargetId
//             );
//             return false;  // Return false for validation failure
//         }

//         // Check if samValue is missing, not a number, or not a positive number
//         if (hasSamKey && (!samValue || isNaN(samValue) || samValue <= 0)) {
//             console.error("SAM value must be required and a positive number");
//             nodeElement.css({
//                 'border': '2px solid red',
//                 'box-shadow': '0 0 10px red'
//             });
//             self.ctx.showToast(
//                 "error", 
//                 "Fail to save Flow data: SAM value must be required and a positive number", 
//                 5000, 
//                 "top", 
//                 "start", 
//                 self.ctx.$scope.toastTargetId
//             );
//             return false;  // Return false for validation failure
//         }
//     }
//     return true;  // Return true if validation succeeds
// };




	
	
	function saveFlowData(flowData){
	    	let assignedPES = []
	    	let assignedWorkersName = []
	    	let relationObservers = []
	    	let pesAttributeObservers = []
	    	let constructedData = []
	    	let attributeData = []
	    	let workerDeviceId
	    	for(let key in flowData){
    	        if(flowData[key].data.ETS_List && flowData[key].data.ETS_List.length){
                    assignedPES.push(flowData[key].data.ETS_List[0]);
                    // $scope.replacePESinDevices(flowData[key].data.ETS_List[0]);
                    if(flowData[key].data.workerList && flowData[key].data.workerList.length && flowData[key].data.workerList[0].length){
                        assignedWorkersName = assignedWorkersName.concat(flowData[key].data.workerList[0].map(worker => worker.worker_id))
                    }
                    
        	        let observable = new rxjs.Observable(subscriber => {
        	            let workerList = flowData[key].data.workerList[0] ? flowData[key].data.workerList[0] : ""
        	            let etsdevice = $scope.UnassignedPESDeviceList.find(device => device.name == flowData[key].data.ETS_List[0]);
        	            if(etsdevice && etsdevice.worker_id && etsdevice.assigned_workers){
        	             let currentWorker =  etsdevice.assigned_workers.find(worker => worker.worker_id == etsdevice.worker_id);
        	             if(currentWorker){
        	                 if(workerList){
        	                     workerList = workerList.find(worker => worker.worker_id == currentWorker.worker_id) ?  workerList : workerList.concat(currentWorker)
        	                 }else{
        	                     workerList = [].concat(currentWorker)
        	                 }
        	                 
        	             }
        	            }
        	           pesServerAttributes = {
            		    order_id: $("#orderId").val(),
            			style_no: $("#styleNo").val(),
            			line_no: $("#process").val(),
            			assigned_workers: workerList,
            			process_name: flowData[key].data.ProcessName ? flowData[key].data.ProcessName : "",
            			id: flowData[key].data.ETS_List[0] ? flowData[key].data.ETS_List[0] : "",
            			mode: "draft",
            			assigned: true,
            			checkPart: flowData[key].data.checkPart ? flowData[key].data.checkPart : null,
            			child_groups: flowData[key].data.child_groups ? flowData[key].data.child_groups : "",
            			to_flow: $scope.getToFlowETSFromNode(key),
            			from_flow: $scope.getFromFlowETSFromNode(key),
            			bundle: "",
        	        }
    	           let device = self.ctx.$scope.allPESDevices.find(device => device.name === flowData[key].data.ETS_List[0])
    	           if(device){
    	               pesServerAttributes.order_styles =  setOrderStyleArrayInPes(device, 'add')
    	           }
    
        	        attributeData = attributeDataConstruct(pesServerAttributes); 
    
        	       //  saveAttributeData(attributeData, flowData[key].data.PES_Id).subscribe(result => {
        	        saveAttributeDataOfPes(attributeData, flowData[key].data).subscribe(result => {
        	                subscriber.next(key)
        	            })
        	        }, error => {
        	            console.log("Attribute Errorr", error, key)
        	                subscriber.error(error)
        	        })
        
        	        pesAttributeObservers.push(observable)
    	        }
    	        
    	        if(flowData[key].data.workerList && flowData[key].data.workerList[0] && flowData[key].data.workerList[0].length){
    	            let data = {...flowData[key].data.workerList[0][0]}
    	            workerDeviceId = data.id
    	            delete data.id;
    			    constructedData = attributeDataConstruct(data);
    			    
                    saveAttributeData(constructedData, workerDeviceId).subscribe(response => {
                        // self.ctx.showToast("success", "Fail to save worker data", 5000, "top", "start", self.ctx.$scope.toastTargetId);
                    }, error => {
                        self.ctx.showToast("error", "Fail to save worker data", 5000, "top", "start", self.ctx.$scope.toastTargetId);
                    })
    	        }
	        }
	        
	        
    	    if(pesAttributeObservers.length){
    	       rxjs.combineLatest(pesAttributeObservers).subscribe(result => {
    	            result.forEach(key => {
    	                let observable = new rxjs.Observable(subscriber => {
    		                saveRelationData($scope.ProductionLineEntityDeviceId, flowData[key].data.PES_Id).subscribe(result => {
    		                    subscriber.next(key)
    		                }, error => {
    		                    subscriber.error(error)
    		                })
    		            })
    	               relationObservers.push(observable)
    	            })
    	            
    	            rxjs.combineLatest(relationObservers).subscribe(result => {
    	               
    	                result.forEach(key => {
    	                    
                    		saveCalculatedTargetOnPES(flowData[key].data.PES_Id, flowData[key].data.sam);
    	                })
    	               let removedWorkers = getRemovedWorkers(assignedWorkersName)
    	               
                       if(removedWorkers.length){
                            saveRemovedWorkersData(removedWorkers)
                       }
    	                let removedPES = getRemovedPes(assignedPES)
        		        if(removedPES.length){
        		            saveRemovedPesData(removedPES)
        		        }else{
        		            if($scope.loading){
        		              $scope.loading = false;
        		              self.ctx.showToast("success", "Data saved successfully", 5000, "top", "start", self.ctx.$scope.toastTargetId);
        		            }
        		        }
        		       $scope.initialAssignedPES = []
    	               $scope.setInitialAssignedPES(flowData)
    	            }, error => {
    	                self.ctx.showToast("error", "Fail to save relation of PES ", 5000, "top", "start", self.ctx.$scope.toastTargetId);
    	            })
    	            
    	        }, error => {
    	            self.ctx.showToast("error", "Attribute is not saved ", 5000, "top", "start", self.ctx.$scope.toastTargetId);
    	        })
    
    	    }
    	    else{
    	        let removedWorkers = getRemovedWorkers(assignedWorkersName)
                if(removedWorkers.length){
                    saveRemovedWorkersData(removedWorkers)
                }
                let removedPES = getRemovedPes(assignedPES)
    	        if(removedPES.length){
        		  saveRemovedPesData(removedPES)
    	        }
    	        if($scope.loading){
    	           $scope.loading = false;
    	           self.ctx.showToast("success", "Data saved successfully", 5000, "top", "start", self.ctx.$scope.toastTargetId);
    	        }

    	    }

	    }
	     
	$scope.replacePESinDevices = function(currentPesName){
	    let changes = $scope.changedPESList.filter(pes => pes.new == currentPesName || pes.old == currentPesName);
	    let lastChangeStatus = {}
	    if(changes && changes.length){
	        lastChangeStatus.old = changes[0].old; 
	        lastChangeStatus.new = changes[changes.length-1]['new'];

	    if(lastChangeStatus.old != lastChangeStatus.new){
	        let query = `update attribute_kv set str_v = ${lastChangeStatus.new} where attribute_key = 'pes' and str_v = '${lastChangeStatus.old}';`
	    
	       let url = `${http.baseUrl}updatePesOnDevices?newPes=${lastChangeStatus.new}&&oldPes=${lastChangeStatus.old}`
	   
		  console.log("change pes url", url)

			http.method.get(url, http.config).subscribe(function(r) {
			    console.log("change pes response", r)
			})
	        
	    }
	}
	}
	
	function getRemovedPes(assignedPES){
       let removedPES = $scope.initialAssignedPES.filter(pes => assignedPES.indexOf(pes.name) === -1)
    //   console.log("removedPES", $scope.initialAssignedPES, removedPES)
    //   let removedPesName = removedPES.map(pes => pes.name)
    //   if(removedPesName.length){
    //         $scope.initialAssignedPES = $scope.initialAssignedPES.filter(pes => !removedPesName.includes(pes.name))
    //   }
       return removedPES;
	}
	
	function getRemovedWorkers(assignedWorkersName){
	  let removedWorkers = $scope.initialAssignedWorkers.filter(worker => !assignedWorkersName.includes(worker.name))
	  return removedWorkers;
	}
	function saveRemovedPesData(removedPES){
	    
	    for(let pes of removedPES){
	       let device = self.ctx.$scope.allPESDevices.find(device => device.name === pes.name)
	       let order_styles
           if(device){
              order_styles =  setOrderStyleArrayInPes(device, 'remove')
           }
        //   console.log("order_styles", order_styles)
           if(order_styles && order_styles.length){
               pesServerAttributes = {order_styles: order_styles}
           }else{
               pesServerAttributes = {
        		    order_id: null,
        			style_no: null,
        			line_no: null,
        			assigned_workers: null,
        			process_name: null,
        			mode: null,
        			assigned: false,
        			child_groups: null,
        			to_flow: null,
        			from_flow: null,
        			bundle: null,
        			order_styles: null
		        }
           }

		    let attributeData = attributeDataConstruct(pesServerAttributes);
		    saveAttributeData(attributeData, pes.id).subscribe(attribute =>{
		       if(order_styles && order_styles.length == 0){
		          deleteRelationData($scope.ProductionLineEntityDeviceId, pes.id).subscribe(relation => {
            	        if($scope.loading){
            	           $scope.loading = false;
            	           self.ctx.showToast("success", "Data saved successfully", 5000, "top", "start", self.ctx.$scope.toastTargetId);
            	        }
        		    }, error => {
        		        self.ctx.showToast("error", "Fail to delete relation of removed PES ", 5000, "top", "start", self.ctx.$scope.toastTargetId);
        		    })  
		       }else{
		           $scope.loading = false;
		           self.ctx.showToast("success", "Data saved successfully", 5000, "top", "start", self.ctx.$scope.toastTargetId);
		       }
		    }, error => {
		        self.ctx.showToast("error", "Fail to save attribute of removed PES", 5000, "top", "start", self.ctx.$scope.toastTargetId);
		    })
		    
		    let styleWisePesName = styleWisePesNameGenerator(pes.name);
    	    let existingPES = self.ctx.$scope.allStyleWisePESDevices.find(item => item.name === styleWisePesName)
    	    if(existingPES){
    	          saveAttributeData(attributeData, existingPES.id).subscribe()
    	    }
		  
		    
		  //  let observer = new rxjs.Observable(subscriber => {
		        
		  //  })
	    }
	}
	
	
	function saveRemovedWorkersData(removedWorkers){
	    for(let worker of removedWorkers){
	        workerServerAttributes = {
 			    order_id : null,
				style_no : null,
				line_no : null,
		    }
		    let attributeData = attributeDataConstruct(workerServerAttributes);
		    saveAttributeData(attributeData, worker.id).subscribe(attribute =>{
    	       // if($scope.loading){
    	       //    $scope.loading = false;
    	       //    self.ctx.showToast("success", "Data saved successfully", 5000, "top", "start", self.ctx.$scope.toastTargetId);
    	       // }
		    }, error => {
		        self.ctx.showToast("error", "Fail to save attribute of removed workers", 5000, "top", "start", self.ctx.$scope.toastTargetId);
		    })
	    }
	}
	
	let saveCalculatedTargetOnPES = function(entityId, sam){
	    
	   // console.log(entityId,sam)
	   
	   let target = calculatePESTargetSam(sam)
	   if(entityId){
	   	 self.ctx.deviceService.getDeviceCredentials(entityId.id).subscribe((response)=>{
	   	 let currentTime = new Date().getTime();
         self.ctx.attributeService.getEntityTimeseries(entityId, ['target_production'], 0, new Date().getTime(),null,'NONE', null, 'DESC').subscribe(function(r) {

            let nextHourTimeStamp = Math.floor((currentTime + 3600000)/3600000)*3600000;
            const dt=[{ts: nextHourTimeStamp, values:{target_production : parseInt(target)}}];
            if(r.target_production && r.target_production.length){
                dt.push({ts: nextHourTimeStamp-3600000, values:{target_production : r.target_production[0].value}})
            }else{
                 dt.push({ts: nextHourTimeStamp-3600000, values:{target_production : parseInt(target)}})
 
            }
                const headers = {'content-type': 'application/json', 'Accept-Charset': 'UTF-8'}
    
            
                const req=self.ctx.http.post('/api/v1/'+response.credentialsId+'/telemetry', dt, headers);
                req.subscribe(res=>{
                });
            })

	   	 })	 
	   }
  	     
	}
	let calculatePESTarget = function(minTs, maxTs, learningRate){
	    return Math.floor(3600/minTs);
	}
    
    let calculatePESTargetSam = function(sam) {
        // console.log("sam value:", sam);
        return sam ? Math.floor(60 / sam) : 0;
    }
    
	$scope.download = function(content, fileName, contentType) {
		const a = document.createElement("a");
		const file = new Blob([content], {
			type: contentType,
		});
		a.href = URL.createObjectURL(file);
		a.download = fileName;
		a.click();
	};
	
	
	
	
	
	$scope.setProcessOnCurrentNode = function(process) {
	    
		var currentFlow = $scope.editor.export();
		
		if(process !=""){
		    
		   
		    const node = $("#node-" + $scope.selectedNodeId);
		    
		    node.find("#ProcessNameText").html(process.name);
            node.find(".minmaxbox-latest").css("display", "flex");
        
            // Update all values
            node.find("#maxVal").val(process.max_item_completion_time).attr('value', process.max_item_completion_time);
            node.find("#minVal").val(process.min_item_completion_time).attr('value', process.min_item_completion_time);
            node.find("#learningRate").val(process.learning_rate).attr('value', process.learning_rate);
            
            
            const samValue = process.sam || 0.1;
            const targetValue = calculatePESTargetSam(samValue); 
            
            // Sam and target value updates
            node.find("#samValue").val(samValue).attr('value', samValue); 

            
              
            node.find("#targetValue").val(targetValue).attr('value', targetValue);  
        
           const currentFlowNodeData = currentFlow.drawflow.Home.data[$scope.selectedNodeId].data
           currentFlowNodeData.ProcessName = process.name;
           currentFlowNodeData.sam=samValue;
           currentFlowNodeData.target=targetValue;
           currentFlowNodeData.min=process.min_item_completion_time;
           currentFlowNodeData.max=process.max_item_completion_time;
           currentFlowNodeData.learning_rate = process.learning_rate;
           

		}else{
	    	const node = $("#node-" + $scope.selectedNodeId);

        node.find("#ProcessNameText").html('Process Name');
        node.find(".minmaxbox-latest").css("display", "none");
        
        
        node.find("#maxVal, #minVal, #learningRate, #samValue, #targetValue").val("").attr('value', "");
        
        
        const selectedNodeData = currentFlow.drawflow.Home.data[$scope.selectedNodeId].data;
        const resetTemplate = {
            ProcessName: "",
            max: "",
            min: "",
            learning_rate: "",
            sam: "",
            target: ""
        };

        Object.keys(resetTemplate).forEach(key => {
            selectedNodeData[key] = resetTemplate[key];
        });
        
        
        
		}

		currentFlow.drawflow.Home.data[$scope.selectedNodeId].html = $("#node-" + $scope.selectedNodeId).find(".drawflow_content_node").html();
		$scope.editor.drawflow = currentFlow;
	};
	
	
	$scope.export = function(name) { 
		var exported = $scope.editor.export();

		let fileName = ($("#orderId").val().trim() + '_' + $("#styleNo").val().trim() + '_' + $("#process").val().trim()) + '.json'
		$scope.download(JSON.stringify(exported), fileName, "text/plain");
	};
	
	$scope.addfile = function(event) {
		let selectedFile = event.target.files[0];
		if(selectedFile) {
			$scope.fileName = selectedFile.name;
			let fileReader = new FileReader();
			fileReader.readAsBinaryString(selectedFile);
			fileReader.onload = (event) => {
			   let data = event.target.result;
			   data = JSON.parse(data);
              swal.fire({
                title: 'How do you want to import the flow?',
                input: 'radio',
                inputOptions: {
                  option1: 'With PES',
                  option2: 'Without PES'
                },
                inputValidator: function(value) {
                  if (!value) {
                    return 'You need to choose an option';
                  }
                },
                confirmButtonText: "Import"
              }).then(function(result) {
                if (result.isConfirmed) {
                  var selectedOption = result.value;
                  if (selectedOption === 'option1') {
                     $scope.editor.import(data);
                  } else if (selectedOption === 'option2') {
                    removePesFromFlow(data)
                    $scope.editor.import(data);
                  }
            		$scope.buttonListener();
                }
              });
			};
		}
	};

    let removePesFromFlow = function(exported){
    	Object.keys(exported.drawflow.Home.data).map(function(key, index) {
    	exported.drawflow.Home.data[key].data.ETS_List = [];
    	exported.drawflow.Home.data[key].data.workerList = [] 
    	exported.drawflow.Home.data[key].data.PES_Id = ""
    	Object.keys(exported.drawflow.Home.data[key].data).forEach((keyChild, indexChild) =>{
    	    if(keyChild.includes('PES-')){
    	        delete exported.drawflow.Home.data[key].data[keyChild];
    	    }
    	})
        const parser = new DOMParser();
        const parsedHtml = parser.parseFromString(exported.drawflow.Home.data[key].html, 'text/html');
        const myDiv = parsedHtml.querySelector('.box');
        const pesDiv = parsedHtml.querySelector('.pes_list');
        myDiv.innerHTML = '';
        pesDiv.innerHTML = '';
        exported.drawflow.Home.data[key].html = parsedHtml.body.innerHTML;
    });
    }

	function currentNodeViewUpdateJson(currentFlow) {
		currentFlow.drawflow.Home.data[$scope.selectedNodeId].html = $("#node-" + $scope.selectedNodeId).find(".drawflow_content_node")[0].innerHTML;
		$scope.editor.drawflow = currentFlow;
	}

	function addPESModalController(instance) {
		let vm = instance;
		vm.selectable = true;
		vm.removable = true;
		
		let existingPES = $scope.getETSFromNode($scope.selectedNodeId)
		
		vm.pes_Devices =  existingPES;
		let currentFlow = $scope.editor.export();
		let flowData = currentFlow.drawflow.Home.data
		let pesIds = []

		for(let key in flowData){
		  //  console.log("flowData[key].data:", flowData[key].data);

		    if(flowData[key].data.ETS_List[0]){
		        pesIds.push(flowData[key].data.PES_Id.id)
		    }
		}

		let unassignedInThisLine = $scope.UnassignedPESDeviceList.filter(device => !pesIds.includes(device.id.id))
        vm.filterdUnassignedPESDeviceList = unassignedInThisLine
		vm.remove = function(index) {
			vm.pes_Devices = []
		};

		vm.selected = function(event) {
			$("#ets_input").trigger("blur");
			if(event.option.value.line_no){
			    if(!$scope.isDifferentLinePES(event.option.value.line_no)){
			        vm.pes_Devices = [event.option.value]
			    }
			}else{
			    vm.pes_Devices = [event.option.value];
			}
		};
		vm.FilterData = function(event) {
		    if(event.target.value){
		        vm.filterdUnassignedPESDeviceList = unassignedInThisLine.filter((f) => f.name.toLowerCase().includes(event.target.value.toLowerCase()));
		    }else{
		        vm.filterdUnassignedPESDeviceList = unassignedInThisLine
		    }
		};
		vm.close = function() {
			vm.dialogRef.close();
		};
		vm.save = function() {
		    $scope.savePesToFlow(vm.pes_Devices)
		    vm.dialogRef.close(null);
// 			$scope.pes_Devices = vm.pes_Devices;
// 			currentFlow = $scope.editor.export();
// 			let pesChanged = false;
// 			let selectedDrawflowNode = currentFlow.drawflow.Home.data[$scope.selectedNodeId]
// 			let newPes = vm.pes_Devices[0];
// 			let oldPesName = selectedDrawflowNode.data.ETS_List[0]
// 			let workerList = selectedDrawflowNode.data.workerList ? selectedDrawflowNode.data.workerList[0]: null
// 			if(newPes && oldPesName){
//     		    if(oldPesName != newPes.name){
//     		       $scope.UnassignedPESDeviceList.push({id: selectedDrawflowNode.data.PES_Id, name: oldPesName})
//     		       const index = $scope.UnassignedPESDeviceList.findIndex( pes => pes.name === newPes.name);
// 			        if(index != -1) {
// 				        $scope.UnassignedPESDeviceList.splice(index, 1);
// 			        }
// 			     //   $scope.initialAssignedPES = $scope.initialAssignedPES.filter(pes => pes.name != oldPesName)
//                     pesChanged = true;
//     		    }
// 			}else if(newPes && !oldPesName){
// 			   const index = $scope.UnassignedPESDeviceList.findIndex( pes => pes.name === newPes.name);
// 			   if(index != -1) {
// 				    $scope.UnassignedPESDeviceList.splice(index, 1);
// 			   }
// 			    pesChanged = true;
// 			}else if(!newPes && oldPesName){
// 			    pesChanged = true;
// 			    $scope.UnassignedPESDeviceList.push({id: selectedDrawflowNode.data.PES_Id, name: oldPesName})
// 			 //   $scope.initialAssignedPES = $scope.initialAssignedPES.filter(pes => pes.name != oldPesName)
// 			}
// 			if(pesChanged){
// 			    updatePesAndWorkerListHtml()
// 			    selectedDrawflowNode.data.workerList = [[]]
// 			}
// 			selectedDrawflowNode.data.ETS_List = vm.pes_Devices.map(pes => pes.name);
// 			selectedDrawflowNode.data.PES_Id = vm.pes_Devices[0] ?  vm.pes_Devices[0].id: null;
// 			currentNodeViewUpdateJson(currentFlow);
// 			vm.dialogRef.close(null);
// 			addWorkerListener();
		};
		self.ctx.detectChanges();
	}
	$scope.savePesToFlow = function(pes_Devices, nodeId=$scope.selectedNodeId){
	    	$scope.pes_Devices = pes_Devices; 
			currentFlow = $scope.editor.export();
			let pesChanged = false;
			let selectedDrawflowNode = currentFlow.drawflow.Home.data[nodeId]
			let newPes = pes_Devices[0];
			let oldPesName = selectedDrawflowNode.data.ETS_List[0]
			let workerList = selectedDrawflowNode.data.workerList ? selectedDrawflowNode.data.workerList[0]: null
			if(newPes && oldPesName){
    		    if(oldPesName != newPes.name){
    		     
                    pesChanged = true;
    		    }
			}else if(newPes && !oldPesName){
			 
			    pesChanged = true;
			}else if(!newPes && oldPesName){
			    pesChanged = true;
		
			}
			if(pesChanged){
			    updatePesAndWorkerListHtml();
			    selectedDrawflowNode.data.workerList = [[]]
			}
// 			console.log("$scope.changedPESList", $scope.changedPESList)
			selectedDrawflowNode.data.ETS_List = pes_Devices.map(pes => pes.name);
			selectedDrawflowNode.data.PES_Id = pes_Devices[0] ? pes_Devices[0].id: null;
			currentNodeViewUpdateJson(currentFlow);
			addWorkerListener();
	}
	$scope.isDifferentLinePES = function(line_no){
		if(line_no.trim() != $("#process").val().trim()){
	        self.ctx.showToast("error", "This PES is already assinged in line " + line_no +" . Please remove from that line before reuse.", 10000, "top", "start", self.ctx.$scope.toastTargetId);
	        return true
		}else{
		    return false
		}
	}
	function updatePesAndWorkerListHtml(){
	   // var htmlETSView = '<ol class="column">';
	   //console.log('---------update calling--------');
	    var htmlETSView = '';
	    let pes_list_view = '';
	    $scope.pes_Devices.forEach((item) => {
			let workerid = '-';
		  //  htmlETSView += '<li id="4" >' + '<div style = "width: 100%;height: 30px;display: flex;">' + '<p id="' + item.name + '"  class ="ets-text">' + item.name + "</p>" + '  <i id="' + "clicked" + item.name + '" class="material-icons add-worker" style="margin-left: auto;margin-right:10px">person_add</i>' + "</div>" + '<p id="' + "text" + $scope.selectedNodeId + "-" + item.name + '"' + 'class="worker-text-latest">' + workerid + '</p>' + "</li>";
		    pes_list_view = `<div id="${item.name}" class ="ets-text">${item.name}</div>`;
		    htmlETSView = `<div style="display: flex;align-items:center;justify-content: space-between;border-top: 2px solid black;">
		        <i class="material-icons" style="width:10%;float: left; padding: 4px; text-align: center; line-height: 40px;">person_apron</i>
		        <p id="text${$scope.selectedNodeId}-${item.name}" class="worker-text-latest" style="margin: 0px">${workerid}</p>
		        <i id="clicked${item.name}" class="material-icons add-worker" style="margin-right:10px">person_add</i>
		    </div>`
	    });
	   // htmlETSView += "</ol>";
		$("#node-" + $scope.selectedNodeId).find(".pes_list").html(pes_list_view);
		$("#node-" + $scope.selectedNodeId).find(".box").html(htmlETSView);
		
	    $(`#node-${$scope.selectedNodeId} .pes_container`).css('background', 'white');
	}
	
	function addStylePartModalController(instance) {
		let vm = instance;
		vm.selectable = true;
		vm.removable = true;
		vm.isMiddleFeedingProcess = false;
        vm.stylePartsOfNode = getStylePartFromNode($scope.selectedNodeId)
        vm.feedingBundlesOfNode = [];
        currentFlow = $scope.editor.export();
        if(currentFlow.drawflow.Home.data[$scope.selectedNodeId].data.middle_feeding_bundles && currentFlow.drawflow.Home.data[$scope.selectedNodeId].data.middle_feeding_bundles.length){
            vm.isMiddleFeedingProcess = true;
            vm.feedingBundlesOfNode = currentFlow.drawflow.Home.data[$scope.selectedNodeId].data.middle_feeding_bundles
        }
        
        vm.processName = currentFlow.drawflow.Home.data[$scope.selectedNodeId].name
        if(vm.processName != "style_part_process"){
            if(vm.stylePartsOfNode.length){
                let stylePartName = vm.stylePartsOfNode.map(style => style.name)
                if(stylePartName){
                    $scope.unassignedStyleParts = $scope.unassignedStyleParts.filter(style => !stylePartName.includes(style.name))
                }
            }
        }

        vm.filteredStyleParts = []
        // vm.styleParts = []
        vm.removedParts = []
        vm.removedFeedingBundles = []
        // vm.styleParts =  $scope.unassignedStyleParts
// 		vm.filteredStyleParts =  vm.processName != "style_part_process" ? $scope.unassignedStyleParts: $scope.stylePartsOfLine
		let stylePartNameOfNode = vm.stylePartsOfNode.map(style => style.name)
		vm.filteredStyleParts =  $scope.stylePartsOfLine.filter(style => !stylePartNameOfNode.includes(style.name))
		vm.stylePartsOptions = 	vm.filteredStyleParts;
		let feedingBundleNameOfNode = vm.feedingBundlesOfNode.map(bundle => bundle.name)
		vm.filteredFeedingStyleParts = $scope.stylePartsOfLine.filter(style => !feedingBundleNameOfNode.includes(style.name))
		vm.feedingStylePartsOptions = 	vm.filteredFeedingStyleParts;
// 		vm.fullStylePartsListOfLine = $scope.stylePartsOfLine
		vm.remove = function(index, stylePart) {
		    vm.stylePartsOfNode.splice(index, 1)
		  //  vm.removedParts.push(stylePart)
		    vm.filteredStyleParts.push(stylePart)
		};

// 		vm.selected = function(event) {
// 		    $("#style_part_input").trigger("blur");
// 		    if(!vm.stylePartsOfNode.includes(event.option.value)){
// 		        vm.stylePartsOfNode.push(event.option.value)
// 		        vm.filteredStyleParts = vm.filteredStyleParts.filter(style => style.name != event.option.value.name)

// 		    }
// 		};
		
		vm.selected = function(event) {
		    $("#style_part_input").trigger("blur");
		    if(!vm.stylePartsOfNode.includes(event.option.value)){
		        if(!vm.stylePartsOfNode.find(style => style.name === event.option.value.name)){
		            vm.stylePartsOfNode.push(event.option.value)
		            vm.filteredStyleParts = vm.filteredStyleParts.filter(style => style.name != event.option.value.name)
		        }

		    }
		};
		
		
		vm.FilterData = function(event) {
		    let value = event.target.value
		    if(value){
		        vm.stylePartsOptions = vm.filteredStyleParts.filter(part => 
		             part.name.toLowerCase().includes(value.toLowerCase()));
		      //  vm.filteredStyleParts = vm.processName != "style_part_process" ? $scope.unassignedStyleParts.filter(part => 
		      //       part.name.toLowerCase().includes(value.toLowerCase())) :  $scope.stylePartsOfLine.filter(part => 
		      //       part.name.toLowerCase().includes(value.toLowerCase()))
		    }
		    else{
		      //  vm.filteredStyleParts = vm.processName != "style_part_process" ? $scope.unassignedStyleParts: $scope.stylePartsOfLine
		       vm.stylePartsOptions = vm.filteredStyleParts
		    }
		};
		
		
		vm.removeFeedingBunlde = function(index, stylePart) {
		    vm.feedingBundlesOfNode.splice(index, 1)
		  //  vm.removedFeedingBundles.push(stylePart)
		    vm.filteredFeedingStyleParts.push(stylePart)
		  //  vm.filteredStyleParts.push(stylePart)
		  
		  deleteRelatedNode($scope.selectedNodeId, stylePart.name)
		};

		vm.selectedFeedingBundle = function(event) {
		    $("#style_part_input_feeding").trigger("blur");
		  //  if(!vm.feedingBundlesOfNode.includes(event.option.value)){
		        showConnectionModal({input_id: $scope.selectedNodeId, output_id: event.option.value.name, stylePartInstance: vm, stylePart: event.option.value})
		      //  vm.feedingBundlesOfNode.push(event.option.value)
		      //  vm.filteredFeedingStyleParts = vm.filteredFeedingStyleParts.filter(style => style.name != event.option.value.name)

		  //  }
		};
		
		vm.FilterDataFeedingBunlde = function(event) {
		    let value = event.target.value
		    if(value){
		        vm.feedingStylePartsOptions = vm.filteredFeedingStyleParts.filter(part => 
		             part.name.toLowerCase().includes(value.toLowerCase()))
		    }else{
		        vm.feedingStylePartsOptions = vm.filteredFeedingStyleParts
		    }
		};
		
		vm.close = function() {
			vm.dialogRef.close();
		};
		vm.save = function() {
			currentFlow = $scope.editor.export();
			let htmlETSView = '';
			let styleNames = ''
			if(vm.processName != "style_part_process"){ 
    			vm.stylePartsOfNode.forEach((item, index) => {
    			   	 //   $scope.unassignedStyleParts = $scope.unassignedStyleParts.filter(style => style.name != item.name)
    				styleNames += (index === 0 ? '' : ',') + item.name;
    			});
    // 			vm.removedParts.forEach(part => {
    // 			    if($scope.unassignedStyleParts.findIndex(style => part.name) === -1){
    // 			        $scope.unassignedStyleParts.push(part)
    // 			    }
    // 			})
    			currentFlow.drawflow.Home.data[$scope.selectedNodeId].data.child_groups = vm.stylePartsOfNode.map(style => style.name);
			}else{
			    let allStyleParts = vm.stylePartsOfNode.concat(vm.feedingBundlesOfNode)
			    let allStylePartNames = [...new Set(allStyleParts.map(item => item.name))]
			     allStylePartNames.forEach((name, index) => {
    				styleNames += (index === 0 ? '' : ',') + name;
    			});
    			currentFlow.drawflow.Home.data[$scope.selectedNodeId].data.child_groups = allStyleParts.map(style => style.name);
			}
			htmlETSView = "<h5 style='margin-left: 2px;'>Style Parts: " + styleNames + "</h5>";
			
			currentFlow.drawflow.Home.data[$scope.selectedNodeId].data.middle_feeding_bundles = vm.feedingBundlesOfNode
			$("#node-" + $scope.selectedNodeId).find(".child-group-list").html(htmlETSView);
			currentNodeViewUpdateJson(currentFlow);
			vm.dialogRef.close(null);
			addWorkerListener();
		};
	}

	function addProcessModalController(instance) {
		let vm = instance;
		vm.selectable = true;
		vm.removable = true;
		vm.processList = []
		vm.filteredProcessList = []
		vm.selectedProcess = [];
	    let drawFlowNode = $scope.editor.export().drawflow.Home.data[$scope.selectedNodeId];
	    let currentProcess = drawFlowNode.data.ProcessName;

		vm.selected = function(event) {
		    $("#process_input").trigger("blur");
            vm.selectedProcess = []
			vm.selectedProcess.push(event.option.value);
		};

		vm.FilterData = function(event) {
			vm.filteredProcessList = vm.processList.filter(process => process.name.toLowerCase().includes(event.target.value.toLowerCase()))
		};
		vm.close = function() {
			vm.dialogRef.close(null);
		};
		vm.save = function() {
			if(vm.selectedProcess.length) {
			    $scope.setProcessOnCurrentNode(vm.selectedProcess[0]);
			}else{
			    $scope.setProcessOnCurrentNode("");
			}

			vm.dialogRef.close(null);
		};
		vm.remove = function(index){
		    vm.selectedProcess = []
		}

		http.method.get(http.baseUrl + "_process_details", {}, http.config).subscribe(function(process) {
		    vm.processList = process;
		    vm.filteredProcessList = process;
		  //  console.log("currentprocess==================",process)
		  //   vm.selectedProcess = [{name: currentProcess}]
		    if(currentProcess){
		        vm.selectedProcess.push(process.find(prc => prc.name === currentProcess))
		        
		        
		    }
		}, function(e) {});
	}

	function AddWorkerModalController(instance) {
		var selectedNodeData;
		let vm = instance;
		vm.selectable = true;
		vm.removable = true;
		let existingWorkers = getWorkersByNodeId($scope.selectedNodeId)
	    vm.workers = existingWorkers;

		vm.filteredWorkers = qcSelected ? self.ctx.$scope.qcDeviceList : self.ctx.$scope.WorkerDeviceList
		let workerOrQCMainList = vm.filteredWorkers;
		vm.selected = function(event) {
			$("#worker_input").trigger("blur");
			if(vm.workers.length < 2 && vm.workers.find(worker => worker.name === event.option.value.name) == null) {
				vm.workers.push(event.option.value);
			}
		};
		
		
		vm.remove = function(index) {
			vm.workers.splice(index, 1);
		};
		
		vm.FilterData = function(event) {
			if(event.target.value){
			   vm.filteredWorkers = workerOrQCMainList.filter(worker => worker.label.toLowerCase().includes(event.target.value.toLowerCase()))
			}else{
			    vm.filteredWorkers = workerOrQCMainList
			}

		};
		vm.close = function() {
			vm.dialogRef.close(null);
		};
		vm.save = function() {
			var currentFlow = $scope.editor.export();
			var selectedNodeData = currentFlow.drawflow.Home?.data[$scope.selectedNodeId];
			let addedWorkers = []
			let removedWorkers = []
			if(vm.workers.length) {
				let WorkersStringInNode = '';
				vm.workers.forEach((value, index) => {
					 WorkersStringInNode = WorkersStringInNode + (index == 0 ? '': ',') + value.label;
				});
				$("#" + "text" + $scope.selectedNodeId + "-" + $scope.clickedETS.replace("clicked", "")).html(WorkersStringInNode);
				selectedNodeData.data.workerList[0] = vm.workers.map(worker => {
				    return {
				        // ets_process_flow: null,
				        id: worker.id,
				        label: worker.label,
				        line_no: $("#process").val(),
				        order_id: $("#orderId").val(),
				        style_no:$("#styleNo").val(),
				        // table_name: null,
				        // type: null,
				        worker_id: worker.name,
				        worker_type: qcSelected ? "QC": "Tailor"
				    }
				})
				currentNodeViewUpdateJson(currentFlow);
			}else{
			    selectedNodeData.data.workerList[0] = []
			    $("#" + "text" + $scope.selectedNodeId + "-" + $scope.clickedETS.replace("clicked", "")).html("");
				currentNodeViewUpdateJson(currentFlow);
			}
			vm.dialogRef.close(null);
		};
	}

    createDrawflowInstane();
    setNodeEventListeners();
    setDragEventsListeners();
    setDragEventsListenersForMobile();

	function createDrawflowInstane(){
	    let id = document.getElementById("drawflow");
		$scope.editor = new Drawflow(id);
		$scope.editor.reroute = true;
		$scope.editor.drawflow = {
			drawflow: {
				Home: {
					data: {},
				},
			},
		};
		$scope.editor.start();
	}
	function setNodeEventListeners(){
	    $scope.editor.on("nodeCreated", function(id) {
	        addCopyNodeListener(id)
	        gridMap($scope.editor,id)
	        
	    });
	    $scope.editor.on("nodeRemoved", function(id) {
			let assignedPesList = [];
			currentFlow = $scope.editor.export();
			let processData = currentFlow.drawflow.Home.data;
			let removedDrawFlowData = $scope.selectedNodeData
			if(removedDrawFlowData){
			 //   let removedDrawFlowData = $scope.drawFlowData[id]
			 //   if(removedDrawFlowData){
    			 //   console.log("removedDrawFlowData",removedDrawFlowData, processData, id)
    			    if(removedDrawFlowData.outputs.output_1){
    			        for(let connection of removedDrawFlowData.outputs.output_1.connections){
    			            deleteRelatedNode(connection.node, id)
    			        }
    			    }
        			if(removedDrawFlowData && removedDrawFlowData.data.ETS_List[0] && removedDrawFlowData.data.ETS_List[0].length){
        			    
        			 //  $scope.initialAssignedPES = $scope.initialAssignedPES.filter(pes => pes.name != removedDrawFlowData.data.ETS_List[0])
        			 
        			 //  $scope.UnassignedPESDeviceList.push({id: removedDrawFlowData.data.PES_Id, name: removedDrawFlowData.data.ETS_List[0]})
        			 
        			 
        			 //   let index = $scope.UnassignedPESDeviceList.findIndex(item => item.id === removedDrawFlowData.data.PES_Id)
        			 //   if(index === -1){
        			 //      $scope.UnassignedPESDeviceList.push({id: removedDrawFlowData.data.PES_Id, name: removedDrawFlowData.data.ETS_List[0]})
        			 //   }
        
        			}
		      //}
			}

		});
		$scope.editor.on("nodeSelected", function(id) {
		    $scope.selectedNodeData = $scope.editor.export().drawflow.Home.data[id]
		    checkQcNodeSelection(id)
		    
		    
		  //  console.log("__ node selected id",id)
		  console.log("__node selected variale check", $scope.selectedNodeData)
		});
		$scope.editor.on("moduleCreated", function(name) {});
		$scope.editor.on("moduleChanged", function(name) {});
		$scope.editor.on("connectionRemoved", function(connection) {});
		$scope.editor.on("connectionCreated", function(connection){
		    checkConnectionValidation(connection)
		    });
		    
	    $scope.editor.on("connectionSelected", function(connection){
	        if(!$scope.isConnectionSelected){
	            $scope.isConnectionSelected = true;
	            checkConnectionValidation(connection)
	        }
	        
	    });
		$scope.editor.on("mouseMove", function(position) {});
		$scope.editor.on("nodeMoved", function(id) {
		    gridMap($scope.editor,id)
		});
	
		$scope.editor.on("zoom", function(zoom) {
		  //  console.log("zoom value",zoom)
		});
		$scope.editor.on("translate", function(position) {});
		$scope.editor.on("addReroute", function(id) {});
		$scope.editor.on("removeReroute", function(id) {});
		
		
		
		let isPasteTriggered = false;

        $scope.editor.on("keydown", function (event) {
        //   console.log("keydown event", event);
        
          // Handle copy (Ctrl+c)
          if (event.ctrlKey && event.key === 'c') {
            copySelectedNode();
          }
        
          // Handle paste (Ctrl+v)
          if (event.ctrlKey && event.key === 'v') {
            if (!isPasteTriggered) {
              console.log("pasting node");
              pasteNode();
              isPasteTriggered = true;
            } else {
              console.log("paste prevented");
              isPasteTriggered = false;
            }
          }
        });
		
		
		
			
		
		$scope.editor.pointerdown = (e) => {
        // Check if the click is on the control buttons
        const isControlButton = e.target.closest('.bar-zoom') || e.target.closest('.btn-lock');
        
        if (isControlButton) {
            // Don't initiate drag if clicking controls
            return;
        }

        // Check if the target is a mat-icon or control element
        if (e.target.tagName.toLowerCase() === 'mat-icon') {
            return;
        }

        // Only set up drag behavior if we're clicking the canvas itself
        if (e.target === $scope.editor.container || e.target.classList.contains('drawflow')) {
            $scope.editor.container.onpointermove = $scope.editor.position(e);
            $scope.editor.container.setPointerCapture(e.pointerId);
        }
    }

    $scope.editor.pointerup = (e) => {
        // Only release if we actually captured
        if ($scope.editor.container.hasPointerCapture(e.pointerId)) {
            $scope.editor.container.onpointermove = null;
            $scope.editor.container.releasePointerCapture(e.pointerId);
        }
    }

    // Add click handlers with stopPropagation
    const zoomControls = document.querySelector('.bar-zoom');
    if (zoomControls) {
        zoomControls.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event from bubbling to the container
        });
    }

    const lockControls = document.querySelector('.btn-lock');
    if (lockControls) {
        lockControls.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event from bubbling to the container
        });
    }

    // Attach the pointer events to the container
    $scope.editor.container.addEventListener('pointerdown', $scope.editor.pointerdown);
    $scope.editor.container.addEventListener('pointerup', $scope.editor.pointerup);
    
    function isControlElement(element) {
    return element.closest('.bar-zoom') || 
           element.closest('.btn-lock') || 
           element.tagName.toLowerCase() === 'mat-icon';
}
		
	}
	

	
	
	
	function checkConnectionValidation(connection){
	    let currentFlow = $scope.editor.export();
	    let processData = currentFlow.drawflow.Home.data;
	    let toNode = currentFlow.drawflow.Home.data[connection.input_id]
	    let fromNode = currentFlow.drawflow.Home.data[connection.output_id]
	    showConnectionModal(connection)
	   // if(toNode.data.ETS_List.length == 0 || fromNode.data.ETS_List.length == 0){
	   //     $scope.editor.removeSingleConnection(connection.output_id, connection.input_id, connection.output_class, connection.input_class);
	   // }else{
	   //     showConnectionModal(connection)
	   // }
	}
	



	function showConnectionModal(connection){
	    	    html = `
              <div aria-label="Info" style="width: 500px">
                <mat-toolbar fxLayout="row" color="primary" >
                    <div>Select Join Processes</div>
                    <span fxFlex></span>
                    <button mat-icon-button (click)="close()">
                        <mat-icon>close</mat-icon>
                    </button>
                </mat-toolbar>
                <div mat-dialog-content>
                    <div *ngFor="let item of related_nodes_with_output_id | keyvalue" style="border: 1px solid #bbbbbb; padding: 5px;position: relative; margin-bottom: 10px;background: #E3EDF6;border-radius: 3px;">
                        <div *ngFor="let nodes of item.value; let nodesIndex=index">
                            <div style="margin: 5px 0;display: flex;flex-wrap: wrap;justify-content: space-evenly; align-items: center; gap: 5px">
                                <div *ngFor="let node of nodes;let nodeIndex=index" style="height: 40px;padding-left:1px;background: white;border: 1px solid #5235E9;border-radius: 5px;display: flex;align-items: center;justify-content: center;" (click)="changeRelatedNodes(item.key, nodesIndex, nodeIndex)">
                                    <div style="height: 100%;display: flex;border-right: 1px solid black;align-items: center;padding: 0 15px;background: rgb(82, 53, 233);color: white;" [style.background]="isConnectionSelected || related_nodes_with_output_id[item.key][nodesIndex].length-1!=nodeIndex?'#5235E9':node.selected?'#5235E9':'white'" [style.color]="isConnectionSelected || related_nodes_with_output_id[item.key][nodesIndex].length-1!=nodeIndex?'white':node.selected?'white':'black'">{{node.val}}</div>
                                    <div style="padding: 0 15px;">{{node.val?getProcessName(node.val):''}}</div>
                                </div>
                            </div>
                            <div *ngIf="nodesIndex!=item.value.length-1" style="width: 100%; height: 2px; background: #5235E9;text-align: center;position: relative;margin: 15px 0px;">
                                <span style="width: 20px;height: 20px;border-radius: 50%;color: white;position: absolute;top: -9px;background: #5235E9;padding: 0 2px;">+</span>
                                <div style="width: 8px;height:8px;background:#5235E9;border-radius:50%;position: absolute;top:-3px;left:0"></div>
                                <div style="width: 8px;height:8px;background:#5235E9;border-radius:50%;position: absolute;top:-3px;right:0"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <button *ngIf="!isConnectionSelected" style='margin-bottom: 20px;margin-left: 20px;'mat-raised-button (click)="save()">Save</button>
                <button *ngIf="isConnectionSelected" style="margin-bottom: 20px;margin-left: 20px;background: red; color: white" mat-raised-button (click)="delete()">
                    <mat-icon>delete</mat-icon>delete
                </button>
            </div>`;
// let html = `<h1>Connection modal</h1>`
			data = {connection : connection};
			data.html = html;
			customDialog.customDialog(html, connectionConfigureModalController, data).subscribe();
	}
	

	function connectionConfigureModalController(instance){
	    let vm = instance;
	    vm.isConnectionSelected = $scope.isConnectionSelected;
	    
	    
	    let input_id = vm.data.connection.input_id;
	    let output_id = vm.data.connection.output_id;
	    let processNameWithOutput_id = output_id;
	    let currentFlow = $scope.editor.export();
	    let inputNodeData = currentFlow.drawflow.Home.data[input_id];
	   // vm.processName = inputNodeData.name;
	   vm.getProcessName = (node_id) => {
	       return $scope.editor.export().drawflow.Home.data[node_id] ? $scope.editor.export().drawflow.Home.data[node_id].data.ProcessName : "";
	   }
	    
	    const related_nodes = currentFlow.drawflow.Home.data[input_id].data.related_nodes?JSON.parse(JSON.stringify(currentFlow.drawflow.Home.data[input_id].data.related_nodes)):{};

	    vm.related_nodes_with_output_id = JSON.parse(JSON.stringify(related_nodes))
	    
	    // modify related_nodes
	    for(const sec in vm.related_nodes_with_output_id){
	        vm.related_nodes_with_output_id[sec] = vm.related_nodes_with_output_id[sec].map(ele=>{
	            for(let j=0;j<ele.length;j++) ele[j] = {val: ele[j], selected: false}
	            return ele;
	        });
	    }
	    
	    // add ouput id
	    const addingOutputIdOnPossiblePositions = () => {
	        for(const sec in vm.related_nodes_with_output_id){
    	        vm.related_nodes_with_output_id[sec] = vm.related_nodes_with_output_id[sec].map(ele=>{
    	            ele.push({val:output_id, selected: false});
    	            return ele;
    	        });
    	        vm.related_nodes_with_output_id[sec].push([{val:output_id, selected: false}]);
    	    }
    	    
    	    vm.related_nodes_with_output_id[`sec${Object.keys(vm.related_nodes_with_output_id).length+1}`] = [[{val: output_id, selected: false}]];
	    }
	    // if new connection 
	    if(!$scope.isConnectionSelected){
	        addingOutputIdOnPossiblePositions();
	    }
	    
	    
	    vm.changeRelatedNodes = (key, nodesIndex, nodeIndex) => {
	        if(vm.related_nodes_with_output_id[key][nodesIndex].length-1!=nodeIndex) return;
	        for(const sec in vm.related_nodes_with_output_id){
	            vm.related_nodes_with_output_id[sec] = vm.related_nodes_with_output_id[sec].map((ele, index)=>{
    	            for(let j=0;j<ele.length;j++){
    	                if(ele[j]['selected']){
    	                    ele[j] = {val: ele[j].val, selected: false}
    	                   if(related_nodes[sec].length>index && related_nodes[sec][index].length){
    	                       related_nodes[sec][index].pop();
    	                       if(related_nodes[sec][index].length==0) related_nodes[sec].pop();
    	                       if(related_nodes[sec].length==0) delete related_nodes[sec];
    	                   }
    	                }
    	            }
    	            return ele;
    	        });
    	    }
    	    vm.related_nodes_with_output_id[key][nodesIndex][nodeIndex]['selected'] = true;
	        
	        if(key in related_nodes){
	            if(related_nodes[key].length>nodesIndex) related_nodes[key][nodesIndex].push(output_id);
	            else related_nodes[key].push([output_id]);
	        }else{
	            related_nodes[key] = [[output_id]];
	        }
	    }
		vm.close = function() {
		    if(!$scope.isConnectionSelected){
		        $scope.editor.removeSingleConnection(vm.data.connection.output_id, vm.data.connection.input_id, vm.data.connection.output_class, vm.data.connection.input_class); 
		    }
		    $scope.isConnectionSelected = false;
			vm.dialogRef.close();
		};
		vm.save = function() {
		    $scope.isConnectionSelected = false
		    let related_nodes_from_node = currentFlow.drawflow.Home.data[input_id].data.related_nodes?{...currentFlow.drawflow.Home.data[input_id].data.related_nodes}:{};
		     
		    if(JSON.stringify(related_nodes_from_node) === JSON.stringify(related_nodes)){
		        if(!vm.data.connection.stylePartInstance){
		            $scope.editor.removeSingleConnection(vm.data.connection.output_id, vm.data.connection.input_id, vm.data.connection.output_class, vm.data.connection.input_class); 
		        }
		    }else{
		        if(vm.data.connection.stylePartInstance){
		            if(!vm.data.connection.stylePartInstance.feedingBundlesOfNode.find(style => style.name == vm.data.connection.output_id)){
		                	vm.data.connection.stylePartInstance.feedingBundlesOfNode.push(vm.data.connection.stylePart)
		                    vm.data.connection.stylePartInstance.filteredFeedingStyleParts = vm.data.connection.stylePartInstance.filteredFeedingStyleParts.filter(style => style.name != vm.data.connection.output_id)
		            }
		        } 
		    }
		    currentFlow = $scope.editor.export();
		    currentFlow.drawflow.Home.data[input_id].data.related_nodes = related_nodes;
		  
		$scope.editor.drawflow = currentFlow;
    	self.ctx.detectChanges();
		vm.dialogRef.close(null);
	}
	    vm.delete = () => {
	        $scope.isConnectionSelected = false;
	        deleteRelatedNode(input_id, output_id)
	   //     let tempRelated_nodes = JSON.parse(JSON.stringify(related_nodes));
	        
	   //     // Remove the output_id and filter out empty arrays
    //         for (let key in tempRelated_nodes) {
    //             tempRelated_nodes[key] = tempRelated_nodes[key].map(innerArray => innerArray.filter(num => num !== output_id)).filter(innerArray => innerArray.length > 0);
    //         }
            
    //         // Remove properties with empty arrays
    //         for (let key in tempRelated_nodes) {
    //             if (tempRelated_nodes[key].length === 0) {
    //                 delete tempRelated_nodes[key];
    //             }
    //         }
	        
	   //     currentFlow = $scope.editor.export();
		  //  currentFlow.drawflow.Home.data[input_id].data.related_nodes = tempRelated_nodes;
	        
	        
	   //     $scope.editor.drawflow = currentFlow;
    //     	self.ctx.detectChanges();
        	
        	$scope.editor.removeSingleConnection(vm.data.connection.output_id, vm.data.connection.input_id, vm.data.connection.output_class, vm.data.connection.input_class);
        	
    		vm.dialogRef.close(null);
	        
	    }
	}
	
	function deleteRelatedNode(input_id, output_id){
	    	 let currentFlow = $scope.editor.export();
	    	 const related_nodes = currentFlow.drawflow.Home.data[input_id].data.related_nodes?JSON.parse(JSON.stringify(currentFlow.drawflow.Home.data[input_id].data.related_nodes)):{};
	    	 let tempRelated_nodes = JSON.parse(JSON.stringify(related_nodes));
	        
	        // Remove the output_id and filter out empty arrays
            for (let key in tempRelated_nodes) {
                tempRelated_nodes[key] = tempRelated_nodes[key].map(innerArray => innerArray.filter(num => num !== output_id)).filter(innerArray => innerArray.length > 0);
            }
            
            // Remove properties with empty arrays
            for (let key in tempRelated_nodes) {
                if (tempRelated_nodes[key].length === 0) {
                    delete tempRelated_nodes[key];
                }
            }
	        
	        currentFlow = $scope.editor.export();
		    currentFlow.drawflow.Home.data[input_id].data.related_nodes = tempRelated_nodes;
	        
	        
	        $scope.editor.drawflow = currentFlow;
        	self.ctx.detectChanges();
	    
	}
	function setDragEventsListenersForMobile(){
	    let elements = document.getElementsByClassName("drag-drawflow");
		for(var i = 0; i < elements.length; i++) {
			elements[i].addEventListener("touchend", $scope.drop, false);
			elements[i].addEventListener("touchmove", $scope.positionMobile, false);
			elements[i].addEventListener("touchstart", $scope.drag, false);
		}
		let mobile_item_selec = "";
		let mobile_last_move = null;
		$scope.positionMobile = function(ev) {
			mobile_last_move = ev;
		};
	}
	
	function setDragEventsListeners(){
	    $scope.allowDrop = function(ev) {
			if(ev != null && $scope.allowDropFlag) {
				ev.preventDefault();
			} else {
				self.ctx.showToast("error", "Please Get Process Flow", 5000, "top", "start", self.ctx.$scope.toastTargetId);
			}
		};
		
		$scope.drag = function(ev) {
			if(ev != null) {
				if(ev.type === "touchstart") {
					mobile_item_selec = ev.target.closest(".drag-drawflow").getAttribute("data-node");
				} else {
					ev.dataTransfer.setData("node", ev.target.getAttribute("data-node"));
				}
			}
		};
		
		$scope.drop = function(ev) {

			if(ev != null) {
				if(ev.type === "touchend") {
				// 	var parentdrawflow = document.elementFromPoint(mobile_last_move.touches[0].clientX, mobile_last_move.touches[0].clientY).closest("#drawflow");
				// 	if(parentdrawflow != null) {
				// 		$scope.addNodeToDrawFlow(mobile_item_selec, mobile_last_move.touches[0].clientX, mobile_last_move.touches[0].clientY);
				// 	}
				// 	mobile_item_selec = "";
				let parentdrawflow = document.elementFromPoint(ev.changedTouches[0].clientX, ev.changedTouches[0].clientY).closest("#drawflow");
					if(parentdrawflow != null) {
						$scope.addNodeToDrawFlow(mobile_item_selec, ev.changedTouches[0].clientX, ev.changedTouches[0].clientY);
					}
					mobile_item_selec = "";
				} else {
					ev.preventDefault();
					let data = ev.dataTransfer.getData("node");
					$scope.addNodeToDrawFlow(data, ev.clientX, ev.clientY);
				}
			}
		};
		
		$scope.addNodeToDrawFlow = function(name, pos_x, pos_y, processName=null, feedingParts=null, samValue=null,targetValue=null,data=null) {
		    
			if($scope.editor.editor_mode === "fixed") {
				return false;
			}
			let htmlETSView
			
			
			
			 if (data === null) {
                pos_x =
                    pos_x *
                        ($scope.editor.precanvas.clientWidth /
                            ($scope.editor.precanvas.clientWidth * $scope.editor.zoom)) -
                    $scope.editor.precanvas.getBoundingClientRect().x *
                        ($scope.editor.precanvas.clientWidth /
                            ($scope.editor.precanvas.clientWidth * $scope.editor.zoom));
                pos_y =
                    pos_y *
                        ($scope.editor.precanvas.clientHeight /
                            ($scope.editor.precanvas.clientHeight * $scope.editor.zoom)) -
                    $scope.editor.precanvas.getBoundingClientRect().y *
                        ($scope.editor.precanvas.clientHeight /
                            ($scope.editor.precanvas.clientHeight * $scope.editor.zoom));
            }
            
            let cardImg="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAqEAAAHYCAMAAABKucH4AAAAAXNSR0IB2cksfwAAAg1QTFRFAAAANRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXNRcXjgbKKQAAAK90Uk5TAECQ4P/AYBAg8DDQULCgcIAD7O1Z9A5+p+kFBnqOxvVVO/kmdv2qq/5FGPefUx4/XPrVjWze6gHnGgSXkQLEEgsJMZMVmU4XKhu4fUfk2qjKB8dnDzbjsg0hzn/mIvuzLMV7j0JddLRJGc/4CjWJ8S/dOqmHEUyseF/S4q/zgvbB1iRB67wUlVSa2cKcJ5hIWL9SS4XDlgiK4bEc35t8ODLNJcn8W25W2KQMo7tjeTrsEf8AACF6SURBVHic7Z35ny5HVcbfmTt3tjvbJSRIAgYIiUgim8slkZhEI0bRCJogQaNRREEMqLgr4oKAK4KiKKgo7tvf6H1nMve+1V3d9Zyqc06dqj7fzyf5IXn7PGd5pt9+u6u7V6vO2dq+sjPm6u5e7cSc5bIXseQstRN2lgLVmUP2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"
            
			switch(name) {
				case "start_process":
				    if(feedingParts){
				        htmlETSView = "<h5 style='margin-left: 2px;'>Style Parts: " + feedingParts + "</h5>";
				    }else{
				        htmlETSView = "<h5 style='margin-left: 2px;'>Style Parts: </h5>";
				    }
					let start_process = `
                          <div>
                            <div style="background: lightgray">
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 10px">
                                    <div class="title-box editProcessName">
                                        <p id='ProcessNameText'> ${processName ? processName : 'Start Process'} </p>
                                        <sup>
                                            <i class="material-icons" style="float: left; padding: 4px; text-align: center; line-height: 40px;">edit</i>
                                        </sup>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <i class="material-icons copyNode" id="copyNode" style="cursor: pointer; font-size: 24px;" title="Copy">content_copy</i>
                                        <input type="checkbox" id="checkPart" name="checkPart" value="true" style="height: 18px; width: 18px;">
                                    </div>
                                </div>
                            </div>

                            </div>
                            
                            
                            <div style="display: flex; justify-content: space-between; align-items: center" class="pes_container">
                                <div style="height: 20px;display: flex;align-items: center;gap: 5px;" onclick="handleSelectNode()">
                                    <img class="rotate" width="35" height="25" src="${cardImg}"/>
                                </div>
                                <div class="pes_list">
                                  -
                                </div>

                                <i class="material-icons button-ets" style="float: left; padding: 4px; text-align: center; line-height: 40px;">playlist_add</i>
                            </div>
                            <div class="box">
                            
                              </div>
                            
                            </div>
                            
                            
                            
                            
                            
                            <div style="display: flex; justify-content: space-between;padding: 0 20px;align-items: center;border-top: 2px solid black;">
                                <div class = "child-group-list">${htmlETSView ? htmlETSView : ''}</div>
                                <i class="material-icons add-group" style="float: left; padding: 4px; text-align: center; line-height: 40px;">add_box</i>
                            </div>
                            
                            <div class= "samtargetBox">
                                <div style="width:90px;">
                                    <div>Sam:</div><input style="width:60px;"  type="text" id="samValue" onchange="handleSamValueChange(event)" oninput="setValue('samValue')" ${samValue ? 'value='+ samValue: ''} name="sam">
                                </div>
                                <div style="width:90px;">
                                    <div>Target:</div><input style="width:60px;" type="text" id="targetValue" 
                                    ${targetValue ? 'value='+ targetValue : ''} 
                                    name="target" disabled>
                                </div>
                            </div>
                            <div class="pes_id">
                            
                            </div>
                            
                            
                          </div>
                        `;
                        
                        const startNodeData = data || {
                                    sam: samValue ? samValue : 0,
                                    target: targetValue ? targetValue : 0,
                                    ETS_List: [],
                                    ProcessName: processName ? processName : "",
                                    child_groups: feedingParts
                                        ? feedingParts.split(',').map(part => part && part.trim()).filter(Boolean)
                                        : [],
                                    checkPart: false,
                                };
                                
					$scope.editor.addNode("start_process", 0, 1, pos_x, pos_y, "start_process", startNodeData, start_process);
					break;
					
				case "middle_process":
                          let middle_process = `
                          <div>
                            <div style="background: lightgray">
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 10px">
                                    <div class="title-box editProcessName">
                                        <p id='ProcessNameText'> ${processName ? processName : 'Middle Process'} </p>
                                        <sup>
                                            <i class="material-icons" style="float: left; padding: 4px; text-align: center; line-height: 40px;">edit</i>
                                        </sup>
                                    </div>
                                     <div style="display: flex; align-items: center; gap: 8px;">
                                        <i class="material-icons copyNode" id="copyNode" style="cursor: pointer; font-size: 24px;" title="Copy">content_copy</i>
                                        <input type="checkbox" id="checkPart" name="checkPart" value="true" style="height: 18px; width: 18px;">
                                    </div>
                                </div>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; align-items: center" class="pes_container">
                                <div style="height: 20px;display: flex;align-items: center;gap: 5px;" onclick="handleSelectNode()">
                                    <img class="rotate" width="35" height="25" src="${cardImg}"/>
                                </div>
                                <div class="pes_list">
                                 -
                                </div>

                                <i class="material-icons button-ets"
                                    style="float: left; padding: 4px; text-align: center; line-height: 40px;">playlist_add</i>
                            </div>
                            <div class="box">
                             
                            </div>
                            
                            
                            <div class = "child-group-list"></div>
                            
                            <div class= "samtargetBox">
                                <div style="width:90px;">
                                    <div>Sam:</div><input style="width:60px;"  type="text" id="samValue" onchange="handleSamValueChange(event)" oninput="setValue('samValue')" ${samValue ? 'value='+ samValue: ''} name="sam">
                                </div>
                                <div style="width:90px;">
                                    <div>Target:</div><input style="width:60px;" type="text" id="targetValue" 
                                    ${targetValue ? 'value='+ targetValue : ''} 
                                    name="target" disabled>
                                </div>
                            </div>
                            
                            <div class="pes_id"></div>
                            
                            
                          </div>
                          `;
                            const middleNodeData = data || {
                                sam: samValue ? samValue : 0,
                                target: targetValue ? targetValue : 0,
                                ETS_List: [],
                                ProcessName: processName ? processName : "",
                                checkPart: false,
                            };
                    // console.log("nodeData", middleNodeData);
					$scope.editor.addNode("middle_process", 1, 1, pos_x, pos_y, "middle_process",middleNodeData , middle_process);
					break;
				case "qc_process":
                        	let qc_process = `
                            <div>
                                <div style="background: lightgray">
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 10px">
                                        <div class="title-box editProcessName">
                                            <p id='ProcessNameText'> ${processName ? processName : "QC"} </p>
                                        </div>
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <i class="material-icons copyNode" id="copyNode" style="cursor: pointer; font-size: 24px;" title="Copy">content_copy</i>
                                            <input type="checkbox" id="checkPart" name="checkPart" value="true" style="height: 18px; width: 18px;">
                                        </div>
                                    </div>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center" class="pes_container">
                                    <div style="height: 20px;display: flex;align-items: center;gap: 5px;" onclick="handleSelectNode()">
                                     <img class="rotate" width="35" height="25" src="${cardImg}"/>
                                    </div>
                                    <div class="pes_list">
                                     -
                                    </div>
                                    <i class="material-icons button-ets"
                                        style="float: left; padding: 4px; text-align: center; line-height: 40px;">playlist_add</i>
                                </div>
                                <div class="box">
                                    
                    
                                </div>
                                
                                <div class= "samtargetBox">
                    
                                    <div style="width:90px;">
                                        <div>Sam:</div><input style="width:60px;"  type="text" id="samValue" onchange="handleSamValueChange(event)" oninput="setValue('samValue')" ${samValue ? 'value='+ samValue: ''} name="sam">
                                    </div>
                                    <div style="width:90px;">
                                        <div>Target:</div><input style="width:60px;" type="text" id="targetValue" 
                                        ${targetValue ? 'value='+ targetValue : ''} 
                                        name="target" disabled>
                                    </div>
                                </div>
                                
                                <div class="pes_id">
                                </div>
                            </div>
                        `;
                        const qcNodeData = data ||  {
            						ETS_List: [],
            						ProcessName: "QC"
            					}
					$scope.editor.addNode("qc_process", 1, 0, pos_x, pos_y, "qc_process",qcNodeData, qc_process);
					break;
				case "intermediate_qc":
					let intermediate_qc = `
                            <div>
                                <div style="background: lightgray">
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 10px">
                                        <div style="color: #22598c;max-width: 100%;overflow: hidden;height: 50px;line-height: 50px;">
                                            <p id='ProcessNameText'>${processName ? processName : "Intermediate QC"}</p>
                                        </div>
                                       <div style="display: flex; align-items: center; gap: 8px;">
                                            <i class="material-icons copyNode" id="copyNode" style="cursor: pointer; font-size: 24px;" title="Copy">content_copy</i>
                                            <input type="checkbox" id="checkPart" name="checkPart" value="true" style="height: 18px; width: 18px;">
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="display: flex; justify-content: space-between; align-items: center" class="pes_container">
                                    <div style="height: 20px;display: flex;align-items: center;gap: 5px;" onclick="handleSelectNode()">
                                         <img class="rotate" width="35" height="25" src="${cardImg}"/>
                                    </div>
                                    <div class="pes_list">
                                      -
                                    </div>

                                    <i class="material-icons button-ets"
                                        style="float: left; padding: 4px; text-align: center; line-height: 40px;">playlist_add</i>
                                </div>
                                <div class="box">
                                     
                                    
                                </div>
                                
                                
                                <div class= "samtargetBox">
                                    <div style="width:90px;">
                                        <div>Sam:</div><input style="width:60px;"  type="text" id="samValue" onchange="handleSamValueChange(event)" oninput="setValue('samValue')" ${samValue ? 'value='+ samValue: ''} name="sam">
                                    </div>
                                    <div style="width:90px;">
                                        <div>Target:</div><input style="width:60px;" type="text" id="targetValue" 
                                        ${targetValue ? 'value='+ targetValue : ''} 
                                        name="target" disabled>
                                    </div>
                                </div>
                                <div class="pes_id">
                                </div>
                            </div>
                        `;
                        const intermediateQCNodeData = data || {
                                sam: samValue ? samValue : 0,
                                target: targetValue ? targetValue : 0,
        						ETS_List: [],
        						ProcessName: "QC",
        						checkPart : false
        					};
					$scope.editor.addNode("intermediate_qc", 1, 1, pos_x, pos_y, "intermediate_qc",intermediateQCNodeData, intermediate_qc);
					break;
				case "iron_qc":
					let iron_qc = `
                            <div>
                                <div style="background: lightgray">
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 10px">
                                        <div style="color: #22598c;max-width: 100%;overflow: hidden;height: 50px;line-height: 50px;">
                                            <p id='ProcessNameText'>QC</p>
                                        </div>
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <i class="material-icons copyNode" id="copyNode" style="cursor: pointer; font-size: 24px;" title="Copy">content_copy</i>
                                            <input type="checkbox" id="checkPart" name="checkPart" value="true" style="height: 18px; width: 18px;">
                                        </div>
                                    </div>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center" class="pes_container">
                                    <div style="height: 20px;display: flex;align-items: center;gap: 5px;" onclick="handleSelectNode()">
                                         <img class="rotate" width="35" height="25" src="${cardImg}"/>
                                    </div>
                                   
                                   <div class="pes_list">
                                     -
                                    </div>


                                   
                                    <i class="material-icons button-ets"
                                        style="float: left; padding: 4px; text-align: center; line-height: 40px;">playlist_add</i>
                                </div>
                                 <div class="box">
                                     
                                    
                                    </div>
                                
                               <div class= "samtargetBox">
                    
                                    <div style="width:90px;">
                                        <div>Sam:</div><input style="width:60px;"  type="text" id="samValue" onchange="handleSamValueChange(event)" oninput="setValue('samValue')" ${samValue ? 'value='+ samValue: ''} name="sam">
                                    </div>
                                    <div style="width:90px;">
                                        <div>Target:</div><input style="width:60px;" type="text" id="targetValue" 
                                        ${targetValue ? 'value='+ targetValue : ''} 
                                        name="target" disabled>
                                    </div>
                                </div>
                                
                                <div class="pes_id">
                                </div>
                            </div>
                        `;
                        const ironQCNodeData = data || {
        					sam: samValue ? samValue : 0,
                            target: targetValue ? targetValue : 0,
    						ETS_List: [],
    						ProcessName: "Iron QC"
    					};
					$scope.editor.addNode("iron_qc", 1, 0, pos_x, pos_y, "iron_qc",ironQCNodeData,  iron_qc);
					break;
					case "style_part_process" : 
					   // let style_part_process = `
        //                   <div>
        //                     <div class="title-box">
        //                         <p id='ProcessNameText'> Process Name </p>
        //                         <i class="material-icons editProcessName" style="float: left; padding: 4px; text-align: center; line-height: 40px;">edit</i>
        //                         <i class="material-icons add-group" style="float: left; padding: 4px; text-align: center; line-height: 40px;">add_box</i>
        //                         <i class="material-icons button-ets">playlist_add</i><br><br>
        //                     </div>
        //                     <div class = "child-group-list"></div>
        //                     <div class="minmaxbox-latest" style="display: none;">
        //                         <div style="width:90px;">
        //                             <div>LR:(%)</div><input style="width:60px;"  type="text" id="learningRate" oninput="setValue('learningRate')" name="fname">
        //                         </div>
        //                         <div style="width:90px;">
        //                             <div>MinTs:(s)</div><input style="width:60px;"  type="text" id="minVal" oninput="setValue('minVal')" name="fname">
        //                         </div>
        //                         <div style="width:90px;"> 
        //                             <div>MaxTs:(s)</div><input style="width:60px;"  type="text" id="maxVal" oninput="setValue('maxVal')" name="fname">
        //                         </div>
        //                     </div>
        //                     <div class="box">
        //                     </div>
        //                   </div>
        //                 `;

    				     let related_nodes ={}
                        let feedingPartNames =feedingParts ? feedingParts.split(/[+,]/).map(part => {if(part && part.trim()){ return part.trim()}}) : []
                        let feedingPartSections = feedingParts ? feedingParts.split(','):[]
                        feedingPartSections.forEach((partSection, i) => {
                            related_nodes[`sec${i+1}`] = partSection.includes('+') ? partSection.split('+').map(part => [part.trim()]) : [[partSection.trim()]]
                        })
                        if(feedingParts){
    				        htmlETSView = "<h5 style='margin-left: 2px;'>Style Parts: " + feedingPartNames + "</h5>";
    				        // htmlETSView = "Style Parts: -" + feedingPartNames
    				    }else{
    				        htmlETSView = "<h5 style='margin-left: 2px;'>Style Parts: " + "</h5>";
    				    }
                        let style_part_process = `
                        <div>
                            <div style="background: lightgray">
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 10px">
                                    <div class="title-box editProcessName">
                                        <p id='ProcessNameText'> ${processName ? processName : 'Process Name'} </p>
                                        <sup>
                                            <i class="material-icons" style="float: left; padding: 4px; text-align: center; line-height: 40px;">edit</i>
                                        </sup>
                                    </div>
                                    <input type="checkbox" id="checkPart" name="checkPart"  value="true"  style="height: 18px; width: 18px;">
                                </div>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; align-items: center" class="pes_container">
                                <div style="height: 20px;display: flex;align-items: center;gap: 5px;" onclick="handleSelectNode()">
                                    <img class="rotate" width="35" height="25" src="${cardImg}"/>
                                </div>
                                <div class="pes_list">-</div>
                                <i class="material-icons button-ets"
                                    style="float: left; padding: 4px; text-align: center; line-height: 40px;">playlist_add</i>
                            </div>
                            <div class="box">
                            </div>
                            
                            
                            <div style="display: flex; justify-content: space-between;padding: 0 20px;align-items: center;border-top: 2px solid black;">
                                <div class = "child-group-list">${htmlETSView ? htmlETSView : ''}</div>
                                <i class="material-icons add-group" style="float: left; padding: 4px; text-align: center; line-height: 40px;">add_box</i>
                            </div>
                            <div class= "samtargetBox">
                    
                                <div style="width:90px;">
                                    <div>Sam:</div><input style="width:60px;"  type="text" id="samValue" onchange="handleSamValueChange(event)" oninput="setValue('samValue')" ${samValue ? 'value='+ samValue: ''} name="sam">
                                </div>
                                <div style="width:90px;">
                                    <div>Target:</div><input style="width:60px;" type="text" id="targetValue" 
                                    ${targetValue ? 'value='+ targetValue : ''} 
                                    name="target" disabled>
                                </div>
                            </div>
                            
                            <div class="pes_id"></div>
                          </div>
                          
                          `;
                       
                       const stylePartProcessNodeData = data || {
						    sam: samValue ? samValue : 0,
                            target: targetValue ? targetValue : 0,
							ETS_List: [],
							ProcessName: processName ? processName : "",
							child_groups: feedingPartNames,
							checkPart : false,
				// 			middle_feeding_bundles: feedingParts ? feedingParts.split(/[+,]/).map(part => {if(part && part.trim()){ return {name: part}}}) : [],
					        middle_feeding_bundles: feedingPartNames.map(part => {return {name: part}}),
					        related_nodes: related_nodes
					}
                       
                        $scope.editor.addNode("style_part_process", 1, 1, pos_x, pos_y, "style_part_process",stylePartProcessNodeData , style_part_process);
                        break;
				default:
			}
			$scope.buttonListener();
		};
		
		
    
    
	}
	
	function checkQcNodeSelection(id){
    	qcSelected = false;
    	var currentFlow = $scope.editor.export();
    	var flowData = currentFlow.drawflow.Home.data[id].data;
    // 	console.log("ProcessName", flowData.ProcessName)
    	if(flowData.ProcessName === "QC" || flowData.ProcessName === "Iron QC"){
    	   qcSelected = true;
    	}
    	$scope.selectedNodeId = id;
    // 	$scope.radioSelection = id;
    // 	console.log('=============', $scope.selectedNodeId);
	}
	
	$scope.changeMode = function(option) {
		if(option == "lock") {
			lock.style.display = "none";
			unlock.style.display = "block";
		} else {
			lock.style.display = "block";
			unlock.style.display = "none";
		}
	};
	
	$scope.clear = function(){
	    let currentFlow = $scope.editor.export();
    	let flowData = currentFlow.drawflow.Home.data;
    	for(let key in flowData){
    	    $scope.selectedNodeId = key;
    	    self.ctx.$scope.savePesToFlow([], key)
    	}
	    $scope.editor.clearModuleSelected()
	}
	
	handleSelectNode = function(){
	    if($scope.radioSelection == $scope.selectedNodeId){
	        $scope.radioSelection = null;
	        $(".pes_container").css('background', 'white');
	    }else{
	        $scope.radioSelection = $scope.selectedNodeId;
    	    $(".pes_container").css('background', 'white');
    	    $(`#node-${$scope.selectedNodeId} .pes_container`).css('background', '#00f1076b'); 
	    }
	   
	}
	
    setValue = function(inputType){
        const node = $("#node-" + $scope.selectedNodeId);
        // console.log("inputType",inputType)
        const inputValue = event.target.value;
	    if(inputType == 'minVal'){
	      node.find("#minVal").val(inputValue).attr('value', inputValue);
	    }else if(inputType == 'maxVal'){
	        node.find("#maxVal").val(inputValue).attr('value', inputValue);
	    }else if(inputType == "samValue"){
            if (inputValue <= 0 || isNaN(inputValue)) {
            self.ctx.showToast("error", "Sam value must be a positive number!", 5000, "top", "start", self.ctx.$scope.toastTargetId);
            return;
            }
            node.find("#samValue").val(inputValue).attr('value', inputValue);
            const targetValue = calculatePESTargetSam(inputValue);  
            node.find("#targetValue").val(targetValue).attr('value', targetValue);
        
	    }
	    else{
            node.find("#learningRate").val(inputValue).attr('value', inputValue);
	    }
	   currentNodeViewUpdateJson($scope.editor.export());
	}
	
	handleSamValueChange = function(event) {
        const node = $("#node-" + $scope.selectedNodeId);
        let inputValue = parseFloat(event.target.value);
        let currentFlow = $scope.editor.export();
        
        console.log("selected node data after handle change",$scope.selectedNodeData)
        
        if (!$scope.selectedNodeData.data.ProcessName || $scope.selectedNodeData.data.ProcessName.trim() === "") {
            node.find("#samValue").val("").attr('value', "");
            node.find("#targetValue").val("").attr('value', "");
            self.ctx.showToast("error", "Process Name cannot be empty!", 5000, "top", "start", self.ctx.$scope.toastTargetId);
            return;
        }
        
        if (inputValue <= 0 || isNaN(inputValue)) {
            inputValue = 0.1;
            event.target.value = inputValue; // Corrects input field value
            self.ctx.showToast("error", "Sam value cannot be zero or negative. Setting to 0.1!", 5000, "top", "start", self.ctx.$scope.toastTargetId);
        }
    
        node.find("#samValue").val(inputValue).attr('value', inputValue);
        const targetValue = calculatePESTargetSam(inputValue);
        node.find("#targetValue").val(targetValue).attr('value', targetValue);
        
        const currentFlowNodeData = currentFlow.drawflow.Home.data[$scope.selectedNodeId].data
        
           currentFlowNodeData.sam=inputValue;
           currentFlowNodeData.target=targetValue;
           console.log("currentFlowNodeData",currentFlowNodeData)
           
           currentFlow.drawflow.Home.data[$scope.selectedNodeId].html = $("#node-" + $scope.selectedNodeId).find(".drawflow_content_node").html();
		$scope.editor.drawflow = currentFlow;
    } 
	

	$scope.setPartCheckProperty = function(drawFlowData){
	    for(let key in drawFlowData){
	        if(drawFlowData[key].data.checkPart){
	           $("#node-" + key).find("#checkPart").prop('checked', true)
	        }
	    }
	    
	}
	styleWisePesNameGenerator = function(pesName){
	     return ($("#orderId").val() + '_' + $("#styleNo").val() + '_' + pesName).replaceAll(" ", "_");
	}
	
	setOrderStyleArrayInPes = function(device, operation){
	   let style_orders = ($("#orderId").val().trim() + '_' + $("#styleNo").val().trim()).replaceAll(' ', '_');
	   if(operation == 'add'){
    	   if(device.order_styles && Array.isArray(device.order_styles)){
               if(device.order_styles.indexOf(style_orders) == -1){
                    device.order_styles.push(style_orders)
               }
           }else{
                device.order_styles = [style_orders]
           }
	   }else{
	       if(device.order_styles && Array.isArray(device.order_styles)){
	           let index = device.order_styles.indexOf(style_orders)
               if(index != -1){
                    device.order_styles.splice(index, 1)
               }
           }else{
                device.order_styles = []
           }
	   }

       return device.order_styles;
	}
	
	setProcessInfoOnFlowData = function(){
	    let currentFlow = $scope.editor.export();
	    for(let key in currentFlow.drawflow.Home.data){
    	   currentFlow.drawflow.Home.data[key].data.max = $("#node-" + key).find("#maxVal").val();
	       currentFlow.drawflow.Home.data[key].data.min = $("#node-" + key).find("#minVal").val();
	       currentFlow.drawflow.Home.data[key].data.learning_rate = $("#node-" + key).find("#learningRate").val()
	       currentFlow.drawflow.Home.data[key].data.checkPart = $("#node-" + key).find("#checkPart").prop('checked')
	    }
	    $scope.editor.drawflow = currentFlow;
	}
	
    function getDevices () {
    	http.method.get(http.baseUrl + "allDevices" ,http.config).subscribe(function(r) {
    	        r.forEach(device => {
    	            self.ctx.$scope.allStyleWisePESDevices.push(device);
    	        })
    	 })
    }
    
    
    
    
    
    // Handle Datasources
    self.ctx.datasources.forEach((entityData) => {
		if(entityData.aliasName == "Unassigned PES") {
		self.ctx.$scope.UnassignedPESDeviceList.push({id: entityData.entity.id, name: entityData.entity.name});
		self.ctx.$scope.allPESDevices.push({id: entityData.entity.id, name: entityData.entity.name})
		} else if(entityData.aliasName == "Tailor") {
			self.ctx.$scope.WorkerDeviceList.push({id: entityData.entity.id, name: entityData.entity.name, label: entityData.entity.label});
		}else if(entityData.aliasName == "QC") {
		    self.ctx.$scope.qcDeviceList.push({id: entityData.entity.id, name: entityData.entity.name, label: entityData.entity.label});
		}else if(entityData.aliasName == "Line PES"){
			self.ctx.$scope.assignedPESDeviceList.push({id: entityData.entity.id, name: entityData.entity.name});
		} else if(entityData.aliasName == "Production Line") {
			self.ctx.$scope.ProductionLineEntityDeviceId = entityData.entity.id;
		} else if(entityData.aliasName == "Line Style") {
			self.ctx.$scope.ProductionLineStyleId = entityData.entity.id;
		}
// 		else if(entityData.aliasName == "All Devices") {
// 			self.ctx.$scope.allStyleWisePESDevices.push(entityData.entity);
// 		}
	});
    getDevices()
    
    $scope.jq = function ( myid ) {
        myid = myid+""
    return myid.replace(/(:|\.|\[|\]|\(|\)|,|=|@)/g, "\\$1");
    }

}
self.onDataUpdated = function() {
	if(self.ctx.data && self.ctx.data.length > 0) {
	        handleCtxData();
			$("#orderId").val(self.ctx.$scope.lineDetails.order_id);
			$("#styleNo").val(self.ctx.$scope.lineDetails.style_no);
			$("#process").val(self.ctx.$scope.lineDetails.line_no);

			$("#orderId").prop("disabled", true);
			$("#styleNo").prop("disabled", true);
			$("#process").prop("disabled", true);
			
			if(!getProcessFlow && $scope.editor){
			    self.ctx.$scope.get_processFlow();
			}
		}
};

function handleCtxData(){
	self.ctx.data.forEach((ctxData) => {
    	if(ctxData.datasource.aliasName == "Production Line") {
    		self.ctx.$scope.lineDetails[ctxData.dataKey.name] = ctxData.data[0][1];
    	}
    	else if(ctxData.datasource.aliasName == "Line Style") {
    	    self.ctx.$scope.stylePartsOfLine = JSON.parse(ctxData.data[0][1])
    	}
    	else if(ctxData.datasource.aliasName === "Unassigned PES") {
    	    if(ctxData.dataKey.name === 'line_no'){
    	        let device = self.ctx.$scope.UnassignedPESDeviceList.find(device => device.id.id === ctxData.datasource.entityId)
    		    if(device){
    		        device.line_no = ctxData.data[0][1]
    		    }
    	    }
    	    else if(ctxData.dataKey.name === 'assigned_workers'){
    	        let device = self.ctx.$scope.UnassignedPESDeviceList.find(device => device.id.id === ctxData.datasource.entityId)
    		    if(device){
    		        if(ctxData.data[0][1]){
    		            device.assigned_workers = JSON.parse(ctxData.data[0][1])
    		        }
    		    }
    	    }
    	    else if(ctxData.dataKey.name === 'worker_id'){
    	        let device = self.ctx.$scope.UnassignedPESDeviceList.find(device => device.id.id === ctxData.datasource.entityId)
    		    if(device){
    		        device.worker_id = ctxData.data[0][1]
    		    }
    	    }
    	   else if(ctxData.dataKey.name === 'order_styles'){
    	        let device = self.ctx.$scope.allPESDevices.find(device => device.id.id === ctxData.datasource.entityId)
    		    if(device && ctxData.data[0][1]){
    		        device.order_styles = JSON.parse(ctxData.data[0][1])
    		    }
    	    }
    	}
    	else if(ctxData.datasource.aliasName == "PES Auto Detector") {
    	   // console.log('---selectedNodeId---', $scope.selectedNodeId)
    	   console.log("auto detector", ctxData)
    	    if($scope.radioSelection){
    	        if(ctxData.dataKey.name == 'PES'){
    	           // console.log('---------', ctxData.data[0][1]);
    	            addPESToFlow(ctxData.data[0][1])
    	        }
    	       // else if(ctxData.dataKey.name = 'PES_ID'){
    	       //     updateFlowNode('PES_Id', ctxData.data[0][1])
    	       // }
    	    }
    	}
    // 	else if(ctxData.datasource.aliasName === "All Devices") {
    // 	    if(ctxData.dataKey.name === 'order_styles'){
    // 	        let device = self.ctx.$scope.allStyleWisePESDevices.find(device => device.id.id === ctxData.datasource.entityId)
    // 		    if(device){
    // 		        device.order_styles = ctxData.data[0][1]
    // 		    }
    // 	    }
    // 	}
});

}

function updatePesAndWorkerListHtml(){
	    var htmlETSView = '<ol class="column">';
	    self.ctx.$scope.pes_Devices.forEach((item) => {
			var workerid = '';
		    htmlETSView += '<li id="4" >' + '<div style = "width: 100%;height: 30px;display: flex;">' + '<p id="' + item.name + '"  class ="ets-text">' + item.name + "</p>" + '  <i id="' + "clicked" + item.name + '" class="material-icons add-worker" style="margin-left: auto;margin-right:10px">person_add</i>' + "</div>" + '<p id="' + "text" + self.ctx.$scope.radioSelection + "-" + item.name + '"' + 'class="worker-text-latest">' + workerid + '</p>' + "</li>";
	    });
	    htmlETSView += "</ol>";
		$("#node-" + self.ctx.$scope.radioSelection).find(".box").html(htmlETSView);
	}
function addPESToFlow(newPes){
    newPes = JSON.parse(newPes)
    // console.log('selectedNodeId', $scope.selectedNodeId);
    // let pesIds = self.ctx.$scope.initialAssignedPES.map(pes => pes.id.id)
    let currentFlow = $scope.editor.export();
	let flowData = currentFlow.drawflow.Home.data
	let pesIds = []
	for(let key in flowData){
	    if(flowData[key].data.ETS_List[0]){
	        pesIds.push(flowData[key].data.PES_Id.id)
	    }
	}
    // console.log('pesIds', pesIds);
	let unassignedInThisLine = self.ctx.$scope.UnassignedPESDeviceList.filter(device => !pesIds.includes(device.id.id))
    let pesInUnassigned = unassignedInThisLine.find(pes => pes.id.id == newPes.id.id)
    if(pesInUnassigned){
    	if(pesInUnassigned.line_no){
		    if(!$scope.isDifferentLinePES(pesInUnassigned.line_no)){
		        self.ctx.$scope.savePesToFlow([newPes], $scope.radioSelection)
                // self.ctx.$scope.selectedNodeId = null
                self.ctx.$scope.radioSelection = null
		    }
		}else{
	        self.ctx.$scope.savePesToFlow([newPes], $scope.radioSelection)
            // self.ctx.$scope.selectedNodeId = null
            self.ctx.$scope.radioSelection = null
		}
    }else{
         self.ctx.showToast("error", "PES is already assigned in this flow!", 5000, "top", "start", self.ctx.$scope.toastTargetId);
    }

// 	 let currentFlow =  self.ctx.$scope.editor.export();
// 	 if(key == 'ETS_List'){
// 	   currentFlow.drawflow.Home.data[ self.ctx.$scope.selectedNodeId].data[key] = [value]
// 	    self.ctx.$scope.pes_Devices = [{name: value}]
//         updatePesAndWorkerListHtml()
// 	 }else if(key == 'PES_Id'){
// 	   currentFlow.drawflow.Home.data[ self.ctx.$scope.selectedNodeId].data[key] = value
// 	    self.ctx.$scope.editor.drawflow = currentFlow;
// 	 }
// 	  self.ctx.detectChanges();
    // selectedDrawflowNode.data.workerList = [[]]

}
// self.onDestroy = function() {};