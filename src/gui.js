import * as lasso from "./lasso.js";
import * as blurry from "./blurry.js";
import * as alert from "./alert.js";



let LassoToolMode = "None";
let GridSize = 10; // unit: pixel on screen; default value: 10
let withAlert, keepSelection;
let BlurryToolMode = "None";
let BlurryIntensity = 0.5; // default value: 0.5

let SavedPointsSets = {};


// Load GUI
export function loadGUI(){
    viewer.loadGUI(() => {
        viewer.setLanguage("en");
        viewer.toggleSidebar();

        let versionSection = $(`
        <h3 id="menu_version" class="accordion-header ui-widget"><span>Version - Blurry & Selection tools</span></h3>
        <div class="accordion-content ui-widget pv-menu-list"></div>
        `);
        let versionContent = versionSection.last();
        versionContent.html(`
        <p style="margin-top: -15px; text-align: center; font-size: 15px"><br><b><font color=yellow>Last modified: 2023.11.1</font></b></p>
        <p style="margin-top: -10px; margin-bottom: 15px; text-align: center; font-size: 15px"><br><font color=white>Group 4, Synthesis Project 2023</font></p>

        <div class="divider" style="margin-top: 10px; margin-bottom: 10px; font-size: 15px"><span>To do list</span></div>

        <ul style="margin-left: 0px">
            <li style="margin-top: 5px; margin-bottom: 10px">
                Get point clouds color from the original THREE.Points.
            </li>
            <li style="margin-top: 5px; margin-bottom: 10px">
                Forbid to set empty group name.
            </li>
            <li style="margin-top: 5px; margin-bottom: 10px">
                Improve the method of the blurring.
            </li>
            <li style="margin-top: 5px; margin-bottom: 10px">
                ......
            </li>
        </ul>
        `);

        let selectionSection = $(`
            <h3 id="menu_selection" class="accordion-header ui-widget"><span>Selection Tool</span></h3>
            <div class="accordion-content ui-widget pv-menu-list"></div>
        `);
        let selectionContent = selectionSection.last();
        selectionContent.html(`
            <li>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="margin-right: 10px;">
                        <input type="checkbox" id="lasso" name="lasso" value="lasso">
                        <label for="lasso">Lasso selection</label>
                    </div>
                </div>
            </li>
            <li>
                <div style="display: flex; justify-content: space-evenly; margin-top: 10px">
                    <div style="margin-right: 10px;">
                        <button style="cursor: pointer"; class="bounceButton" id="cleanSelectionButton">Clean selection</button>
                    </div>
                    <div>
                        <button style="cursor: pointer"; class="bounceButton" id="saveButton">Complete selection</button>
                    </div>
                </div>
            </li>

            <div style="display: flex; justify-content: center; align-items: center;">
                <div style="margin-top: 15px">Selected POIs: <span id="lblSelectedPoints" style="color: RGB(240, 140, 90)">0</span></div>
            </div>

            <div class="divider" style="margin-top: 15px; margin-bottom: 10px; font-size: 15px"><span>Operation instruction</span></div>

            <ul style="margin-left: 0px">
                <li>Select POIs / Add POIs:
                    <ul style="margin-left: -30px; margin-top: 5px; margin-bottom: 5px">
                        <b><font color=white>Hold scroll wheel</font></b>
                    </ul>
                </li>
                <li>Remove selected POIs partly:
                    <ul style="margin-left: -30px; margin-top: 5px; margin-bottom: 10px">
                    <b><font color=white>Shift + Hold scroll wheel</font></b>
                    </ul>
                </li>
            </ul>
    
            <div class="divider" style="margin-top: 15px; margin-bottom: 10px; font-size: 15px"><span>Selection parameters</span></div>
    
            <li>
                <span>Selection grid size</span>: <span id="lblLassoSensitivity">10</span><div id="sldLassoSensitivity"></div>
                <p><b><font color=white>Controls selection & blurry tools.</font></b></p>
                <p>For optical performance, set larger number when selecting large area.</p>
                <p>For selection accuracy, zoom in and set small number to refine the selection.</p>
            </li>

            <div class="divider" style="margin-top: 15px; margin-bottom: 10px; font-size: 15px"><span>Export selected groups</span></div>

            <div style="display: flex; justify-content: space-evenly; align-items: center;">
                <div>Selected groups: <span id="lblSelectedGroups" style="color: RGB(240, 140, 90)">0</span></div>
                <div>
                    <button style="cursor: pointer"; class="bounceButton" id="exportButton">Export</button>
                </div>
            </div>
        `);
    
        let blurrySection = $(`
            <h3 id="menu_blurry" class="accordion-header ui-widget"><span>Blurry Tool</span></h3>
            <div class="accordion-content ui-widget pv-menu-list"></div>
        `);
        let blurryContent = blurrySection.last();
        blurryContent.html(`
            <li>
                <div style="display: flex; justify-content: space-between;">
                    <div style="margin-right: 10px;">
                        <input type="checkbox" id="blurry" name="blurry" value="blurry" unchecked>
                        <label for="blurry">Blurry tool</label>
                    </div>
                    <div>
                        <button style="cursor: pointer"; class="bounceButton" id="cleanBlurryButton">Clean blurry</button>
                    </div>
                </div>
            </li>
    
            <div class="divider" style="margin-top: 10px; margin-bottom: 10px; font-size: 15px"><span>Operation instruction</span></div>
            
            <ul style="margin-left: 0px">
                <li>Select POIs / Add POIs:
                    <ul style="margin-left: -30px; margin-top: 5px; margin-bottom: 5px">
                        <b><font color=white>B + Hold scroll wheel</font></b>
                    </ul>
                </li>
                <li>Remove selected POIs partly:
                    <ul style="margin-left: -30px; margin-top: 5px; margin-bottom: 10px">
                    <b><font color=white>Shift + B + Hold scroll wheel</font></b>
                    </ul>
                </li>
            </ul>

            <div class="divider" style="margin-top: 15px; margin-bottom: 10px; font-size: 15px"><span>Blurring parameters</span></div>
    
            <li>
                <span>Blurry intensity</span>: <span id="lblBlurryIntensity">0.5</span><div id="sldBlurryIntensity"></div>
                <p>Please set the intensity of the blurring effect before blurry.</p>
                <p>As the blur intensity increases, the performance of the blurring effect is enhanced.</p>
            </li>
        `);
    
        // Add event listener to checkbox
        $(document).ready(function() {
            // jQuery 代码 jQuery code
            $("#lasso").change(function() {
                if (this.checked) {
                    LassoToolMode = "lasso";
                } else {
                    LassoToolMode = "disableLasso";
                }
                updateToolMode();
            });

            $("#saveButton").click(function() {
                lasso.saveLassoSelectedPoints(SavedPointsSets);
            });

            $("#cleanSelectionButton").click(function() {
                lasso.removeLassoSelectedPoints(withAlert=true, keepSelection=false);
            });
    
            $("#sldLassoSensitivity").slider({
                value: 10, // Default value
                min: 5,
                max: 20,
                step: 1,
                slide: function(event, ui) {
                    $("#lblLassoSensitivity").text(ui.value);
                    GridSize = ui.value;
                    // reload lasso selection
                    lasso.removeLassoEventListeners();
                    lasso.removeLassoSelectedPoints(withAlert=false, keepSelection=true);
                    lasso.lassoSelection(GridSize);
                }
            });

            $("#exportButton").click(function() {
                alert.exportWindow();
            });

            $("#blurry").change(function() {
                if (this.checked) {
                    BlurryToolMode = "blurry";
                } else {
                    BlurryToolMode = "disableBlurry";
                }
                updateToolMode();
            });

            $("#cleanBlurryButton").click(function() {
                blurry.removeBlurredPoints();
            });

            $("#sldBlurryIntensity").slider({
                value: 0.5, // Default value
                min: 0.1,
                max: 1.0,
                step: 0.1,
                slide: function(event, ui) {
                    $("#lblBlurryIntensity").text(ui.value);
                    BlurryIntensity = ui.value;
                }
            });
        });
        
        versionSection.first().click(() => versionContent.slideToggle());
        versionSection.insertBefore($('#menu_appearance'));

        selectionSection.first().click(() => selectionContent.slideToggle());
        selectionSection.insertBefore($('#menu_appearance'));

        blurrySection.first().click(() => blurryContent.slideToggle());
        blurrySection.insertBefore($('#menu_appearance'));
    });
}


function updateToolMode() {
    if (BlurryToolMode === "blurry") {
        blurry.blurrySelection(GridSize, BlurryIntensity);
        alert.windowAlert("Blurry tool is enabled.")
    } else if (BlurryToolMode === "disableBlurry") {
        blurry.removeBlurredPoints();
        blurry.removeBlurryEventListeners();
        alert.windowAlert("Blurry tool is disabled.")
    }
    
    if (LassoToolMode === "lasso") {
        lasso.lassoSelection(GridSize);
        alert.windowAlert("Lasso selection is enabled.")
    } else if (LassoToolMode === "disableLasso") {
        lasso.removeLassoSelectedPoints(withAlert=false, keepSelection=false);
        lasso.removeLassoEventListeners();
        alert.windowAlert("Lasso selection is disabled.")
    }
}


export function handleVisibleChange(event) {
    const checkBox = event.target;
    const userName = checkBox.id.split("-")[0];
    const points = SavedPointsSets[userName];
    if (checkBox.checked) {
        viewer.scene.scene.add(points);
    } else {
        viewer.scene.scene.remove(points);
    }
}


export function deleteRow(event) {
    const button = event.target;
    const userName = button.id.split("-")[0];
    const points = SavedPointsSets[userName];
    viewer.scene.scene.remove(points);
    delete SavedPointsSets[userName];
    if (Object.keys(SavedPointsSets).length > 0) {
        updateTable(SavedPointsSets);
    }
}

function updateTable(dictionary) {
    let tableBody = document.getElementById("tableBody");
    tableBody.innerHTML = "";
    
    let keysReversed = Object.keys(dictionary).reverse();
    for (let key of keysReversed) {
        let row = tableBody.insertRow();
        
        console.log(dictionary[key].material.color);
        
        let cell_0 = row.insertCell(0);
        cell_0.textContent = key;
        
        let cell_1 = row.insertCell(1);
        cell_1.textContent = dictionary[key].geometry.attributes.position.count;

        let cell_2 = row.insertCell(2);
        const colorBlock = document.createElement("div");
        colorBlock.style.width = "75px";
        colorBlock.style.height = "15px";
        colorBlock.style.backgroundColor = "#" + dictionary[key].material.color.getHex();
        cell_2.appendChild(colorBlock);

        let cell_3 = row.insertCell(3);
        const checkBox = document.createElement("input");
        checkBox.type = "checkbox";
        checkBox.id = key + "-checkbox";
        checkBox.checked = false;
        checkBox.addEventListener("change", handleVisibleChange);
        cell_3.appendChild(checkBox);

        let cell_4 = row.insertCell(4);
        const button = document.createElement("button");
        button.id = key + "-button";
        button.textContent = "Delete";
        button.addEventListener("click", deleteRow);
        cell_4.appendChild(button);
    }
}


export function downloadData() {
    const jsonData = JSON.stringify(SavedPointsSets);
    const blob = new Blob([jsonData], {type: "application/json"});
    const url = URL.createObjectURL(blob);

    const now = new Date();

    const a = document.createElement('a');
    a.href = url;
    a.download = "data.json";
    a.click();
}


export function storageData() {
    const jsonData = JSON.stringify(SavedPointsSets);
    localStorage.setItem("data", jsonData);
}