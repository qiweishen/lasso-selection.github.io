window.viewer = new Potree.Viewer(document.getElementById("potree_render_area"));
viewer.setEDLEnabled(true);
viewer.setFOV(70);
viewer.setPointBudget(1*1000*1000);
viewer.loadSettingsFromURL();
viewer.setDescription("");

// Global variables
let selectionMode = "";
let gridSize = 10; // unit: pixel on screen

viewer.loadGUI(() => {
    viewer.setLanguage('en');
    viewer.toggleSidebar();
    let section = $(`
        <h3 id="menu_meta" class="accordion-header ui-widget"><span>Selection Tools</span></h3>
        <div class="accordion-content ui-widget pv-menu-list"></div>
    `);
    let content = section.last();
    content.html(`
        <p style="margin-top: -15px; margin-bottom: 15px; font-size: 20px"><br><b><font color=yellow>Last modified: 2023.10.23</font></b></p>

        <div class="divider"><span>--------</span></div>

        <li>
            <input type="checkbox" id="lasso" name="lasso" value="lasso" checked>
            <label for="lasso">Lasso selection <br><b><font color=red>(Always enabled, currently no function)</font></b></label>
        </li>

        <div class="divider" style="margin-top: 10px; margin-bottom: 10px; font-size: 15px"><span>Operation instruction</span></div>
        
        <ul style="list-style-type: disc">
            <li>Select POIs:
                <ul style="margin-left: -30px; margin-top: 5px; margin-bottom: 5px">
                    <b><font color=white>Middle button</font></b>
                </ul>
            </li>
            <li>Add POIs: 
                <ul style="margin-left: -30px; margin-top: 5px; margin-bottom: 5px">
                    <b><font color=white>Ctrl + Middle button</font></b>
                </ul>
            </li>
            <li>Remove selected POIs partly:
                <ul style="margin-left: -30px; margin-top: 5px; margin-bottom: 10px">
                <b><font color=white>Shift + Middle button</font></b>
                </ul>
            </li>
        </ul>

        <div class="divider" style="margin-top: 10px; margin-bottom: 10px; font-size: 15px"><span>Selection parameters</span></div>

        <li>
            <span>Selection grid size</span>: <span id="lblLassoSensitivity">5</span><div id="sldLassoSensitivity"></div>
            <p>For optical performance, set larger number when selecting large area.</p>For selection accuracy, zoom in and set small number to refine the selection.</p>
        </li>
    `);

    // Add event listener to checkbox
    $(document).ready(function() {
        // jQuery 代码 jQuery code
        $("#lasso").change(function() {
            if (this.checked) {
                selectionMode = "lasso";
            } else {
                selectionMode = "None";
            }
        });

        $("#sldLassoSensitivity").slider({
            value: 5, // Default value
            min: 1,
            max: 20,
            step: 1,
            slide: function(event, ui) {
                $("#lblLassoSensitivity").text(ui.value);
                gridSize = ui.value;
            }
        });
    });

    section.first().click(() => content.slideToggle());
    section.insertBefore($('#menu_appearance'));
});



loadData(lassoSelection);



// Load point cloud data
function loadData(callback){
    let scene = viewer.scene;

    let dataPath = "../custom_data/Non-medical-pointcloud-examples/GRAANMOLENTJE_converted/cloud.js";
    let dataName = "GRAANMOLENTJE";

    let dataPathOfficial = "./Potree_1.7/pointclouds/lion_takanawa/cloud.js"
    let dataNameOfficial = "lion_takanawa";

    Potree.loadPointCloud(dataPathOfficial, dataNameOfficial, (data) => {
        scene.addPointCloud(data.pointcloud);
        // Set point cloud material
        let material = data.pointcloud.material;
        material.size = 1;
        // material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
        material.pointSizeType = Potree.PointSizeType.FIXED;
        // Make point cloud fit to screen
        viewer.fitToScreen();

        if (callback) {
            callback();
        }
    });
}


function nothing() {
    return;
}


// Lasso selection
function lassoSelection() {
    let isDrawing = false;
    
    let lassoVertices = [];
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000, // Set line color to red
        linewidth: 2,
        side: THREE.DoubleSide
    });
    const lasso = new THREE.Line(lineGeometry, lineMaterial);

    let selected3DPoints = [];
    const PointGeometry = new THREE.BufferGeometry();
    const PointMaterial = new THREE.PointsMaterial({
        color: 0xffff00,
        size: 4,
        sizeAttenuation: false
    });
    const points = new THREE.Points(PointGeometry, PointMaterial);
    
    let remove3DPoints = [];

    let mouseTrajectory = [];
    let pointCloud = viewer.scene.pointclouds[0];

    viewer.renderer.domElement.addEventListener("mousedown", (event) => {
        if (!event.ctrlKey && !event.shiftKey && event.button === 1) { // Middle button => select POIs
            isDrawing = true;

            selected3DPoints = [];
            lassoVertices = [];
            viewer.scene.scene.add(lasso);

            mouseTrajectory = [];
        } else if (event.ctrlKey && event.button === 1) { // Ctrl + Middle button => add POIs
            isDrawing = true;

            lassoVertices = [];
            viewer.scene.scene.add(lasso);

            mouseTrajectory = [];
        } else if (event.shiftKey && event.button === 1) { // Shift + Middle button => remove POIs
            isDrawing = true;
            remove3DPoints = [];
            
            lassoVertices = [];
            viewer.scene.scene.add(lasso);
            mouseTrajectory = [];
        }
    });

    viewer.renderer.domElement.addEventListener("mousemove", (event) => {
        if (isDrawing) {
            const vertices = get3DPoint_V1(event);
            if (vertices) {
                lassoVertices.push(vertices.point3D);
                mouseTrajectory.push(vertices.mouse);
                update3DLine();
            }
        }
    });

    viewer.renderer.domElement.addEventListener("mouseup", (event) => {
        if ((!event.ctrlKey && !event.shiftKey && event.button === 1) || (event.ctrlKey && event.button === 1)) { // Middle button => select POIs or Ctrl + Middle button => select / add POIs
            isDrawing = false;
            lassoVertices.push(lassoVertices[0]);
            update3DLine();

            mouseTrajectory = removeDuplicatePoints(mouseTrajectory)
            console.log("Number of mouse trajectory points:", mouseTrajectory.length);
            raysFromMouse = getRaysInsideLasso();
            console.log("Number of rays from mouse:", raysFromMouse.length);
            for (let i = 0; i < raysFromMouse.length; i++) {
                const mouse = raysFromMouse[i];
                intersectedPoint = get3DPoint_V2(mouse);
                if (intersectedPoint) {
                    selected3DPoints.push(intersectedPoint);
                }
            }
            selected3DPoints = removeDuplicatePoints(selected3DPoints);
            update3DPoints();
            viewer.scene.scene.add(points);

            setTimeout(cleanLine, 200);  // Remove line after 200ms
            // setTimeout(cleanPoints, 1200);  // Remove points after 200ms
            // selectPoints(vertices, pointCloud); // Start selecting points
            // getGridHelper(lassoVertices); // Show grid helper
            console.log("Lasso vertices: ", lassoVertices);
            console.log("Selected points: ", selected3DPoints);

        } else if (event.shiftKey && event.button === 1) { // Shift + Middle button => remove POIs
            isDrawing = false;
            lassoVertices.push(lassoVertices[0]);
            update3DLine();

            mouseTrajectory = removeDuplicatePoints(mouseTrajectory)
            console.log("Number of mouse trajectory points:", mouseTrajectory.length);
            raysFromMouse = getRaysInsideLasso();
            console.log("Number of rays from mouse:", raysFromMouse.length);
            for (let i = 0; i < raysFromMouse.length; i++) {
                const mouse = raysFromMouse[i];
                intersectedPoint = get3DPoint_V2(mouse);
                if (intersectedPoint) {
                    remove3DPoints.push(intersectedPoint);
                }
            }
            remove3DPoints = removeDuplicatePoints(remove3DPoints);
            selected3DPoints = removePoints(selected3DPoints, remove3DPoints);
            update3DPoints();
            viewer.scene.scene.add(points);

            setTimeout(cleanLine, 200);  // Remove line after 200ms
            // setTimeout(cleanPoints, 1200);  // Remove points after 200ms
            // selectPoints(vertices, pointCloud); // Start selecting points
            // getGridHelper(lassoVertices); // Show grid helper
            console.log("Lasso vertices: ", lassoVertices);
            console.log("Selected points: ", selected3DPoints);
        }
        
    });

    // Version 1: the vertices of lasso shape are on the virtual plane (parallel to the screen)
    function get3DPoint_V1(event) {
        const rect = viewer.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        const mouse = new THREE.Vector2(event.clientX, event.clientY);
        
        const camera = viewer.scene.getActiveCamera();
        const rayCaster = new THREE.Raycaster();
        rayCaster.setFromCamera(new THREE.Vector2(x, y), camera);

        const targetPoint = new THREE.Vector3(0, 0, -1).unproject(camera);
        const planeNormal = new THREE.Vector3().subVectors(targetPoint, camera.position).normalize();
        const planeDistance = 0.1;
        const planePoint = camera.position.clone().add(planeNormal.clone().multiplyScalar(planeDistance));
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);

        const point3D = new THREE.Vector3();
        const isIntersecting = rayCaster.ray.intersectPlane(plane, point3D);

        // console.log("Window coordinates:", mouse);
        // console.log("Intersection point:", point3D);

        return {point3D, mouse};
    }

    // Version 2: the vertices of lasso shape are on the 3D point cloud
    function get3DPoint_V2(mouse) {
        const rect = viewer.renderer.domElement.getBoundingClientRect();
        const x = ((mouse.x - rect.left) / rect.width) * 2 - 1;
        const y = -((mouse.y - rect.top) / rect.height) * 2 + 1;

        const camera = viewer.scene.getActiveCamera();
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
        const ray = raycaster.ray;

        let pickParams = {};
        pickParams.pickClipped = true;
        pickParams.x = mouse.x - rect.left;
        pickParams.y = rect.height - mouse.y;

        const point = pickPoint(pointCloud, viewer, camera, ray, pickParams);
        // console.log(point);

        return point;
    }

    function update3DLine() {
        const positions = [];
        for (let i = 0; i < lassoVertices.length; i++) {
            positions.push(lassoVertices[i].x, lassoVertices[i].y, lassoVertices[i].z);
        }
        lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        lineGeometry.computeBoundingSphere();
        lineGeometry.attributes.position.needsUpdate = true;
    }

    function update3DPoints() {
        const positions = [];
        for (let i = 0; i < selected3DPoints.length; i++) {
            positions[i * 3] = selected3DPoints[i].position.x;
            positions[i * 3 + 1] = selected3DPoints[i].position.y;
            positions[i * 3 + 2] = selected3DPoints[i].position.z;
        }
        PointGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        PointGeometry.computeBoundingSphere();
    }

    function getRaysInsideLasso() {
        // const gridSize = 10; // unit: pixel on screen

        let raysFromMouse = [];
        const boundingBox = new THREE.Box2().setFromPoints(mouseTrajectory);
        const size = boundingBox.getSize(new THREE.Vector2());
        console.log("Bounding box size:", size);
        const x_step = Math.ceil(size.x / gridSize);
        const y_step = Math.ceil(size.y / gridSize);

        for (let i = 0; i < x_step; i++) {
            for (let j = 0; j < y_step; j++) {
                const x = boundingBox.min.x + i * gridSize;
                const y = boundingBox.min.y + j * gridSize;
                const point = new THREE.Vector2(x, y);
                if (isPointInsidePolygon(point, mouseTrajectory)) {
                    raysFromMouse.push(point);
                }
            }
        }

        return raysFromMouse;
    }

    function cleanLine() {
        viewer.scene.scene.remove(lasso);
    }

    function cleanPoints() {
        viewer.scene.scene.remove(points);
    }
    
}









// Useful functions
function isPointInsidePolygon(point, vertices) {
    let intersectCount = 0;

    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;

        if (((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
            intersectCount++;
        }
    }

    return (intersectCount % 2 !== 0);
}


function calculateNormalAndCoplanarPoint(vertices) {
    if (vertices.length < 18) {
        console.error("For accurate plane normal calculation, please draw a larger lasso shape (at least 20 vertices).");
        return;
    }
    
    const A = calculateMeanPoint(vertices.slice(0, vertices.length / 3));
    const B = calculateMeanPoint(vertices.slice(vertices.length / 3, 2 * vertices.length / 3));
    const C = calculateMeanPoint(vertices.slice(2 * vertices.length / 3, vertices.length));
    const avgPoint = calculateMeanPoint(vertices);

    const AB = new THREE.Vector3().subVectors(B, A);
    const AC = new THREE.Vector3().subVectors(C, A);

    const planeNormal = new THREE.Vector3().crossVectors(AB, AC).normalize();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, avgPoint);

    function calculateMeanPoint(verticesSubset) {
        let sum = new THREE.Vector3();
        for (let vertex of verticesSubset) {
            sum.add(vertex);
        }
        return sum.divideScalar(verticesSubset.length);
    }

    return { planeNormal, avgPoint, plane };
}


function removeDuplicatePoints(points) {
    const uniquePoints = [];
    const toRemoveSet = new Set();

    // Set conditions for different point objects (point.x and point.position.x)
    if (!points[0].position) {
        for (let i = 0; i < points.length; i++) {
            const key = `${points[i].x},${points[i].y},${points[i].z}`;  // Use stringified coordinates as key
    
            if (!toRemoveSet.has(key)) {
                toRemoveSet.add(key);
                uniquePoints.push(points[i]);
            }
        }
        return uniquePoints;
    } else {
        for (let i = 0; i < points.length; i++) {
            const key = `${points[i].position.x},${points[i].position.y},${points[i].position.z}`;
    
            if (!toRemoveSet.has(key)) {
                toRemoveSet.add(key);
                uniquePoints.push(points[i]);
            }
        }
        return uniquePoints;
    }
}


function removePoints(points, pointsToRemove) {
    const resultPoints = [];
    const toRemoveSet = new Set();

    // Set conditions for different point objects (point.x and point.position.x)
    if (!pointsToRemove[0].position) {
        for (let i = 0; i < pointsToRemove.length; i++) {
            const key = `${pointsToRemove[i].x},${pointsToRemove[i].y},${pointsToRemove[i].z}`;
            toRemoveSet.add(key);
        }

        for (let i = 0; i < points.length; i++) {
            const key = `${points[i].x},${points[i].y},${points[i].z}`;
            if (!toRemoveSet.has(key)) {
                resultPoints.push(points[i]);
            }
        }

    } else {
        for (let i = 0; i < pointsToRemove.length; i++) {
            const key = `${pointsToRemove[i].position.x},${pointsToRemove[i].position.y},${pointsToRemove[i].position.z}`;
            toRemoveSet.add(key);
        }

        for (let i = 0; i < points.length; i++) {
            const key = `${points[i].position.x},${points[i].position.y},${points[i].position.z}`;
            if (!toRemoveSet.has(key)) {
                resultPoints.push(points[i]);
            }
        }
    }

    return resultPoints;
}


// Adapted from Potree source code (pointcloud.pick())
function pickPoint(pointCloud, viewer, camera, ray, params = {}){

    let renderer = viewer.renderer;
    let pRenderer = viewer.pRenderer;

    performance.mark("pick-start");

    let getVal = (a, b) => a !== undefined ? a : b;

    let pickWindowSize = getVal(params.pickWindowSize, 17);
    let pickOutsideClipRegion = getVal(params.pickOutsideClipRegion, false);

    pickWindowSize = 65;

    let size = renderer.getSize(new THREE.Vector2());

    let width = Math.ceil(getVal(params.width, size.width));
    let height = Math.ceil(getVal(params.height, size.height));

    let pointSizeType = getVal(params.pointSizeType, pointCloud.material.pointSizeType);
    let pointSize = getVal(params.pointSize, pointCloud.material.size);

    let nodes = pointCloud.nodesOnRay(pointCloud.visibleNodes, ray);

    if (nodes.length === 0) {
        return null;
    }

    if (!pointCloud.pickState) {
        let scene = new THREE.Scene();

        let material = new Potree.PointCloudMaterial();
        material.activeAttributeName = "indices";

        let renderTarget = new THREE.WebGLRenderTarget(
            1, 1,
            { minFilter: THREE.LinearFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat }
        );

        pointCloud.pickState = {
            renderTarget: renderTarget,
            material: material,
            scene: scene
        };
    };

    let pickState = pointCloud.pickState;
    let pickMaterial = pickState.material;

    { // update pick material
        pickMaterial.pointSizeType = pointSizeType;
        //pickMaterial.shape = this.material.shape;
        pickMaterial.shape = Potree.PointShape.PARABOLOID;

        pickMaterial.uniforms.uFilterReturnNumberRange.value = pointCloud.material.uniforms.uFilterReturnNumberRange.value;
        pickMaterial.uniforms.uFilterNumberOfReturnsRange.value = pointCloud.material.uniforms.uFilterNumberOfReturnsRange.value;
        pickMaterial.uniforms.uFilterGPSTimeClipRange.value = pointCloud.material.uniforms.uFilterGPSTimeClipRange.value;
        pickMaterial.uniforms.uFilterPointSourceIDClipRange.value = pointCloud.material.uniforms.uFilterPointSourceIDClipRange.value;

        pickMaterial.activeAttributeName = "indices";

        pickMaterial.size = pointSize;
        pickMaterial.uniforms.minSize.value = pointCloud.material.uniforms.minSize.value;
        pickMaterial.uniforms.maxSize.value = pointCloud.material.uniforms.maxSize.value;
        pickMaterial.classification = pointCloud.material.classification;
        pickMaterial.recomputeClassification();

        if(params.pickClipped){
            pickMaterial.clipBoxes = pointCloud.material.clipBoxes;
            pickMaterial.uniforms.clipBoxes = pointCloud.material.uniforms.clipBoxes;
            if(pointCloud.material.clipTask === Potree.ClipTask.HIGHLIGHT){
                pickMaterial.clipTask = Potree.ClipTask.NONE;
            }else{
                pickMaterial.clipTask = pointCloud.material.clipTask;
            }
            pickMaterial.clipMethod = pointCloud.material.clipMethod;
        }else{
            pickMaterial.clipBoxes = [];
        }

        pointCloud.updateMaterial(pickMaterial, nodes, camera, renderer);
    }

    pickState.renderTarget.setSize(width, height);

    let pixelPos = new THREE.Vector2(params.x, params.y);

    let gl = renderer.getContext();
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(
        parseInt(pixelPos.x - (pickWindowSize - 1) / 2),
        parseInt(pixelPos.y - (pickWindowSize - 1) / 2),
        parseInt(pickWindowSize), parseInt(pickWindowSize));


    renderer.state.buffers.depth.setTest(pickMaterial.depthTest);
    renderer.state.buffers.depth.setMask(pickMaterial.depthWrite);
    renderer.state.setBlending(THREE.NoBlending);

    { // RENDER
        renderer.setRenderTarget(pickState.renderTarget);
        gl.clearColor(0, 0, 0, 0);
        renderer.clear(true, true, true);

        let tmp = pointCloud.material;
        pointCloud.material = pickMaterial;

        pRenderer.renderOctree(pointCloud, nodes, camera, pickState.renderTarget);

        pointCloud.material = tmp;
    }

    let clamp = (number, min, max) => Math.min(Math.max(min, number), max);

    let x = parseInt(clamp(pixelPos.x - (pickWindowSize - 1) / 2, 0, width));
    let y = parseInt(clamp(pixelPos.y - (pickWindowSize - 1) / 2, 0, height));
    let w = parseInt(Math.min(x + pickWindowSize, width) - x);
    let h = parseInt(Math.min(y + pickWindowSize, height) - y);

    let pixelCount = w * h;
    let buffer = new Uint8Array(4 * pixelCount);

    gl.readPixels(x, y, pickWindowSize, pickWindowSize, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

    renderer.setRenderTarget(null);
    renderer.state.reset();
    renderer.setScissorTest(false);
    gl.disable(gl.SCISSOR_TEST);

    let pixels = buffer;
    let ibuffer = new Uint32Array(buffer.buffer);

    // find closest hit inside pixelWindow boundaries
    let min = Number.MAX_VALUE;
    let hits = [];
    for (let u = 0; u < pickWindowSize; u++) {
        for (let v = 0; v < pickWindowSize; v++) {
            let offset = (u + v * pickWindowSize);
            let distance = Math.pow(u - (pickWindowSize - 1) / 2, 2) + Math.pow(v - (pickWindowSize - 1) / 2, 2);

            let pcIndex = pixels[4 * offset + 3];
            pixels[4 * offset + 3] = 0;
            let pIndex = ibuffer[offset];

            if(!(pcIndex === 0 && pIndex === 0) && (pcIndex !== undefined) && (pIndex !== undefined)){
                let hit = {
                    pIndex: pIndex,
                    pcIndex: pcIndex,
                    distanceToCenter: distance
                };

                if(params.all){
                    hits.push(hit);
                }else{
                    if(hits.length > 0){
                        if(distance < hits[0].distanceToCenter){
                            hits[0] = hit;
                        }
                    }else{
                        hits.push(hit);
                    }
                }
            }
        }
    }

    for(let hit of hits){
        let point = {};

        if (!nodes[hit.pcIndex]) {
            return null;
        }

        let node = nodes[hit.pcIndex];
        let pc = node.sceneNode;
        let geometry = node.geometryNode.geometry;

        for(let attributeName in geometry.attributes){
            let attribute = geometry.attributes[attributeName];
            // console.log(attributeName);
            if (attributeName === "position") {
                let x = attribute.array[3 * hit.pIndex + 0];
                let y = attribute.array[3 * hit.pIndex + 1];
                let z = attribute.array[3 * hit.pIndex + 2];

                let position = new THREE.Vector3(x, y, z);
                position.applyMatrix4(pc.matrixWorld);

                point[attributeName] = position;
                // console.log("Position is:", position);
            } 
            // else if (attributeName === "indices") {
                // console.log("Index is:", attribute);
            // } 
            else {
                let values = attribute.array.slice(attribute.itemSize * hit.pIndex, attribute.itemSize * (hit.pIndex + 1)) ;

                if(attribute.potree){
                    const {scale, offset} = attribute.potree;
                    values = values.map(v => v / scale + offset);
                }

                point[attributeName] = values;

            }

        }

        hit.point = point;
    }

    performance.mark("pick-end");
    performance.measure("pick", "pick-start", "pick-end");

    if(params.all){
        return hits.map(hit => hit.point);
    }else{
        if(hits.length === 0){
            return null;
        }else{
            return hits[0].point;
        }
    }
};


function getGridHelper(vertices) {
    const planeDetails = calculateNormalAndCoplanarPoint(vertices);
    const planeNormal = planeDetails.planeNormal;
    const planePoint = planeDetails.avgPoint;
    let gridHelper = new THREE.GridHelper(100, 100, 0x00ff00, 0x00ff00); // size and divisions can be adjusted as per need
    let up = new THREE.Vector3(0, 1, 0);
    let quaternion = new THREE.Quaternion().setFromUnitVectors(up, planeNormal);
    gridHelper.quaternion.copy(quaternion);
    gridHelper.position.copy(planePoint);
    
    viewer.scene.scene.add(gridHelper);
}








// // Below is the old version of lasso selection (Archived)


// function getMousePointCloudIntersection (mouse, camera, viewer, pointclouds, params = {}) {
//     let rect = viewer.renderer.domElement.getBoundingClientRect();
//     let nmouse = {
//         x: (mouse.x / rect.width) * 2 - 1,
//         y: -(mouse.y / rect.height) * 2 + 1
//     };
//     let pickParams = {};

//     if(params.pickClipped){
//         pickParams.pickClipped = params.pickClipped;
//     }

//     pickParams.x = mouse.x;
//     pickParams.y = rect.height - mouse.y;

//     let raycaster = new THREE.Raycaster();
//     raycaster.setFromCamera(nmouse, camera);
//     let ray = raycaster.ray;

//     let selectedPointcloud = null;
//     let closestDistance = Infinity;
//     let closestIntersection = null;
//     let closestPoint = null;
    
//     for(let pointcloud of pointclouds){
//         let point = pointcloud.pick(viewer, camera, ray, pickParams);
//         if(!point){
//             continue;
//         }
//         let distance = camera.position.distanceTo(point.position);
//         if (distance < closestDistance) {
//             closestDistance = distance;
//             selectedPointcloud = pointcloud;
//             closestIntersection = point.position;
//             closestPoint = point;
//         }
//     }

//     if (selectedPointcloud) {
//         return {
//             location: closestIntersection,
//             distance: closestDistance,
//             pointcloud: selectedPointcloud,
//             point: closestPoint
//         };
//     } else {
//         return null;
//     }
// }

// function selectPoints(vertices, pointCloud) {
//     console.log("Number of Lasso shape vertices: ", vertices.length);
//     console.log("Point Cloud: ", pointCloud);

//     let pointsOn3DPlane = [];
//     let selectedPoints = [];

//     // 创建投影平面 create projection plane
//     const planeDetails = calculateNormalAndCoplanarPoint(vertices);
//     const plane = planeDetails.plane;
//     // console.log("First vertex:", vertices[0]);
//     // console.log("Plane normal length:", plane.normal.length());
//     // console.log("Plane coplane point:", plane.coplanarPoint());


//     // 将顶点投影到平面上 project vertices onto plane
//     let projectedVertices3D = vertices.map(v => projectPointOntoPlane(v, plane));
//     let projectedVertices2D = projectedVertices3D.map(v => to2DCoordinates(v, plane));

//     // 投影一个点到平面上 project a point onto the plane
//     function projectPointOntoPlane(point, plane) {
//         const coplanarPoint = new THREE.Vector3();
//         plane.coplanarPoint(coplanarPoint); // 获取共面点 get coplanar point

//         const toPoint = new THREE.Vector3().subVectors(point, coplanarPoint);
//         const distanceToPlane = toPoint.dot(plane.normal);
//         // console.log("Length of plane.normal:", plane.normal.length());
//         // console.log("Length of toPoint:", toPoint.length());
//         // console.log("Distance to plane:", distanceToPlane);
//         return point.clone().sub(plane.normal.clone().multiplyScalar(distanceToPlane));
//     }

//     // 将三维坐标转换为二维坐标 convert 3D coordinates to 2D coordinates
//     function to2DCoordinates(point3D, plane) {
//         const planePoint = new THREE.Vector3();
//         plane.coplanarPoint(planePoint); // 获取共面点 get coplanar point;

//         const xAxis = new THREE.Vector3(1, 0, 0);
//         const yAxis = new THREE.Vector3(0, 1, 0);
//         const planeX = plane.normal.clone().cross(yAxis).normalize(); 
//         const planeY = plane.normal.clone().cross(xAxis).normalize();
//         const diff = point3D.clone().sub(planePoint);
//         return new THREE.Vector2(diff.dot(planeX), diff.dot(planeY));
//     }

//     // 检查点是否在多边形内 check if point is inside polygon
//     function isPointInsidePolygon(point, polygonVertices) {
//         let inside = false;
//         for (let i = 0, j = polygonVertices.length - 1; i < polygonVertices.length; j = i++) {
//             let xi = polygonVertices[i].x, yi = polygonVertices[i].y;
//             let xj = polygonVertices[j].x, yj = polygonVertices[j].y;
    
//             let intersect = ((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
//             if (intersect) inside = !inside;
//         }
//         if (inside) {
//             console.log("Point", point);
//         }
//         return inside;
//     }

//     // 遍历八叉树中的所有点 traverse all points in Octree
//     // viewer.scene.pointclouds[0].root.children[0].children[0].children[0].geometryNode.geometry.attributes.position.array
//     // function traverseOctree(node, callback) {
//     //     console.log("Visiting node:", node.name);  // 打印每次访问的节点 print visited node
//     //     if (!node.isLoaded()) {
//     //         console.log("------------Node", node.name, "haven't loaded yet.");
//     //         let id = node.id;
//     //         let boundingSphere = node.getBoundingSphere();
//     //         let center = boundingSphere.center;
//     //         let radius = boundingSphere.radius;
//     //         callback({ id, center, radius });
//     //     } else if (node.children.every(child => child === undefined)) {
//     //         if (node.name.includes("r0")) {
//     //             console.log("++++++++++++Node", node.name, "has loaded.");
//     //             let positions = node.geometryNode.geometry.attributes.position;
//     //             if (positions) {
//     //                 let positionArray = positions.array;
//     //                 for (let i = 0; i < positionArray.length; i += 3) {
//     //                     let point = new THREE.Vector3(positionArray[i], positionArray[i + 1], positionArray[i + 2]);
//     //                     callback({ point });
//     //                 }
//     //             }
//     //         }
//     //     } else {
//     //         console.log("Node", node.name, "has children.");
//     //         for (let child of node.children) {
//     //             if (child !== undefined) {
//     //                 traverseOctree(child, callback);
//     //             }
//     //         }
//     //     }
//     // }

//     // // 遍历八叉树中的所有点 traverse all points in Octree
//     function traverseOctree(node, callback) {
//         // console.log("Visiting node:", node);  // 打印每次访问的节点 print visited node
//         if (node instanceof Potree.PointCloudOctreeNode) {
//             // console.log("Node is a PointCloudOctreeNode");
//             if (node.geometryNode) {
//                 // console.log("PointCloudOctreeNode geometry:", node.geometryNode.geometry);
//                 if (node.geometryNode.geometry.attributes && node.geometryNode.geometry.attributes.position) {
//                     // console.log("PointCloudOctreeNode has position attribute");
//                     callback(node);
//                 }
//             }
//         }
        
//         // 确保在遍历子节点前检查其是一个有效的数组 make sure to check if children is a valid array before traversing
//         if (node.children && Array.isArray(node.children)) {
//             for (let child of node.children) {
//                 if (child) traverseOctree(child, callback);
//             }
//         }
//     }
    

//     // 执行选择 select points
//     // traverseOctree(pointCloud.root, (details) => {
//     //     if (!details.point) {
//     //         let id = details.id;
//     //         let center = details.center;
//     //         let radius = details.radius;
//     //     } else {
//     //         let point = details.point;
//     //         let projectedPoint3D = projectPointOntoPlane(point, plane);
//     //         // console.log("Projected point:", projectedPoint3D);
//     //         pointsOn3DPlane.push(point);
//     //         selectedPoints.push(projectedPoint3D);
//     //         // let projectedPoint2D = to2DCoordinates(projectedPoint3D, plane);
//     //         // console.log("Projected point:", projectedPoint2D);
//     //         // if (isPointInsidePolygon(projectedPoint2D, projectedVertices2D)) {
//     //         //     selectedPoints.push(point);
//     //         // }
//     //     }
//     // });


//      // 执行选择 select points
//      traverseOctree(pointCloud.root, (node) => {
//         let positions;
            
//         if (node instanceof Potree.PointCloudOctreeNode && node.geometryNode) {
//             positions = node.geometryNode.geometry.attributes.position;
//         } else if (node instanceof Potree.PointCloudOctreeGeometryNode) {
//             positions = node.geometry.attributes.position;
//             console.log("PointCloudOctreeGeometryNode")
//         }
    
//         if (positions) {
//             let positionArray = positions.array;
            
//             for (let i = 0; i < positionArray.length; i += 3) {
//                 let point = new THREE.Vector3(positionArray[i], positionArray[i + 1], positionArray[i + 2]);
//                 // console.log("Point:", point);
//                 let projectedPoint3D = projectPointOntoPlane(point, plane);
//                 pointsOn3DPlane.push(point);
//                 // console.log("Projected point:", projectedPoint3D);
//                 let projectedPoint2D = to2DCoordinates(projectedPoint3D, plane);
//                 // console.log("Projected point:", projectedPoint2D);
//                 if (isPointInsidePolygon(projectedPoint2D, projectedVertices2D)) {
//                     selectedPoints.push(point);
//                 }
//             } 
//         }
//     });


//     console.log("Number of points on 3D plane: ", pointsOn3DPlane.length);

//     addPointsToScene(pointsOn3DPlane);
 
//     console.log("Number of selected points: ", selectedPoints.length);

//     // TODO: 高亮显示选择的点 highlight selected points

// }


// function addPointsToScene(pointsList) {
//     let geometry = new THREE.BufferGeometry();
//     let positions = new Float32Array(pointsList.length * 3); // 每个点需要x, y, z坐标
//     for (let i = 0; i < pointsList.length; i++) {
//         positions[i * 3] = pointsList[i].x;
//         positions[i * 3 + 1] = pointsList[i].y;
//         positions[i * 3 + 2] = pointsList[i].z;
//     }
//     geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
//     let material = new THREE.PointsMaterial({ color: 0xff0000, size: 0.023 });
//     let points = new THREE.Points(geometry, material);
//     viewer.scene.scene.add(points);
// }


// function arePointsEqual(pointA, pointB) {
//     const epsilon = 1e-3; // 0.001 for checking precision up to 3 decimal places

//     return Math.abs(pointA.x - pointB.x) < epsilon &&
//            Math.abs(pointA.y - pointB.y) < epsilon &&
//            Math.abs(pointA.z - pointB.z) < epsilon;
// }

