// --- CONFIGURATION ---
const SOIL_DRY = 3500;
const SOIL_WET = 1000;

// VARIABLES FOR 1-HOUR RESET LOGIC
let soilAccumulator = 0; 
let soilReadCount = 0;   
let startTime = Date.now(); 

// CHANGE THIS TO: 60 * 60 * 1000 (1 Hour) for final. 
// Currently 1 Minute for testing.
const RESET_INTERVAL_MS = 60 * 1000; 

let soilHistory = []; // For the trend chart

// NEW: Array to store ALL session data for CSV Export
let sessionData = [];

// <<< START CHANGE: Removed stale logic/variables, we only track last update time now
let lastDataUpdateTime = 0; 
// <<< END CHANGE

// --- 1. SETUP METERS (Gauges) ---
function createMeter(canvasId, maxVal, colorZones) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Value', 'Empty'],
            datasets: [{
                data: [0, maxVal], 
                backgroundColor: [colorZones[0], '#eee'], 
                borderWidth: 0,
                circumference: 180, 
                rotation: 270,
                cutout: '75%'
            }]
        },
        options: {
            aspectRatio: 1.5,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            animation: { animateRotate: true, animateScale: false }
        }
    });
}

const tempMeter = createMeter('tempGauge', 50, ['#e74c3c']); 
const humMeter = createMeter('humGauge', 100, ['#3498db']);  
const lightMeter = createMeter('lightGauge', 100, ['#f1c40f']); 

// --- 2. SETUP CHARTS ---
const comboCtx = document.getElementById('comboChart').getContext('2d');
const comboChart = new Chart(comboCtx, {
    type: 'bar',
    data: {
        labels: [],
        datasets: [
            { type: 'line', label: 'Temperature (°C)', borderColor: '#e74c3c', borderWidth: 2, tension: 0.4, yAxisID: 'y', data: [] },
            { type: 'bar', label: 'Humidity (%)', backgroundColor: 'rgba(52, 152, 219, 0.5)', yAxisID: 'y1', data: [] }
        ]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
            y: { position: 'left', title: {display:true, text:'Temperature'} },
            y1: { position: 'right', grid:{drawOnChartArea:false}, title:{display:true, text:'Humidity %'} }
        }
    }
});

const soilCtx = document.getElementById('soilTrendChart').getContext('2d');
const soilTrendChart = new Chart(soilCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            { label: 'Instant Raw', borderColor: '#2b7bdcff', borderWidth: 1, pointRadius: 0, tension: 0.1, data: [] },
            { label: 'Trend Line', borderColor: '#24ba63ff', borderWidth: 3, pointRadius: 0, tension: 0.4, fill: true, backgroundColor: 'rgba(39, 174, 96, 0.1)', data: [] }
        ]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        scales: { y: { min: 0, max: 100 } },
        plugins: { legend: { display: true } }
    }
});

// --- 3. LOGIC & HELPERS ---
function mapValue(x, in_min, in_max, out_min, out_max) {
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function getAvg(arr) {
    if(!arr.length) return 0;
    return (arr.reduce((a,b)=>a+b, 0) / arr.length).toFixed(1);
}

// --- NEW: CSV DOWNLOAD FUNCTION ---
function downloadCSV() {
    if (sessionData.length === 0) {
        alert("No data to download yet!");
        return;
    }

    // 1. Create CSV Header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Time,Temperature (C),Humidity (%),Soil Moisture (%),Light Intensity (%)\n";

    // 2. Add Data Rows
    sessionData.forEach(row => {
        csvContent += `${row.time},${row.temp},${row.hum},${row.soil},${row.light}\n`;
    });

    // 3. Trigger Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plant_sensor_data_log.csv");
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
}

// <<< START CHANGE: System Status Check Function (checks for empty data)
function checkSystemStatus(dataReceived) {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const plantIcon = document.getElementById('plantIcon');

    if (Object.keys(dataReceived).length === 0) {
        // Data object is empty (Backend signaled stale/OFF)
        statusIndicator.className = 'status-indicator off';
        statusText.innerHTML = 'SYSTEM OFF';
        
        // Change plant to wilted/dead
        plantIcon.innerHTML = '🥀';
        plantIcon.className = 'plant-icon wilted';
    } else {
        // Data object is not empty (System is ON and publishing)
        statusIndicator.className = 'status-indicator on';
        statusText.innerHTML = '🟢 SYSTEM ON';
        
        // Change plant to healthy/grown
        plantIcon.innerHTML = '🌿';
        plantIcon.className = 'plant-icon healthy';
    }
}
// <<< END CHANGE

// Update Function
function updateDashboard() {
    fetch("http://localhost:5000/data")
    .then(r => r.json())
    .then(data => {
        
        // <<< START CHANGE: Check for empty data first to handle OFF state
        checkSystemStatus(data); // Update status immediately based on data payload
        
        if (Object.keys(data).length === 0) {
            console.log("System is OFF (Backend returned empty data). Skipping meter updates.");
            return; // EXIT the function if no valid data is present
        }

        // If data is fresh, mark update time (although not strictly needed now)
        lastDataUpdateTime = Date.now(); 
        // <<< END CHANGE

        const time = new Date().toLocaleTimeString();
        
        // Calculations
        let currentSoilPct = mapValue(data.soil, SOIL_DRY, SOIL_WET, 0, 100);
        currentSoilPct = Math.max(0, Math.min(100, Math.floor(currentSoilPct)));
        let lightPct = Math.floor((data.light / 4095) * 100);

        // --- SAVE TO SESSION LOG (For CSV) ---
        sessionData.push({
            time: time,
            temp: data.temperature,
            hum: data.humidity,
            soil: currentSoilPct,
            light: lightPct
        });

        // 1. UPDATE METERS 
        tempMeter.data.datasets[0].data = [data.temperature, 50 - data.temperature];
        let tColor = data.temperature > 30 ? '#e74c3c' : (data.temperature < 20 ? '#3498db' : '#2ecc71');
        tempMeter.data.datasets[0].backgroundColor = [tColor, '#eee'];
        tempMeter.update();
        document.getElementById('tempText').innerText = data.temperature + "°C";

        humMeter.data.datasets[0].data = [data.humidity, 100 - data.humidity];
        humMeter.update();
        document.getElementById('humText').innerText = data.humidity + "%";

        lightMeter.data.datasets[0].data = [lightPct, 100 - lightPct];
        lightMeter.update();
        document.getElementById('lightText').innerText = lightPct + "%";

        // 2. TANK LOGIC
        if (Date.now() - startTime > RESET_INTERVAL_MS) {
            soilAccumulator = 0;
            soilReadCount = 0;
            startTime = Date.now();
        }
        soilAccumulator += currentSoilPct;
        soilReadCount++;
        let tankAverage = (soilAccumulator / soilReadCount).toFixed(0);

        document.getElementById('liquidFill').style.height = tankAverage + "%";
        document.getElementById('liquidText').innerText = tankAverage + "%";
        let liquidColor = tankAverage < 30 ? '#f1c40f' : '#3498db';
        document.getElementById('liquidFill').style.background = liquidColor;

        // 3. UPDATE CHARTS
        soilHistory.push(currentSoilPct);
        if(soilHistory.length > 50) soilHistory.shift();
        const avgTrend = getAvg(soilHistory);

        // Update Combo
        if(comboChart.data.labels.length > 20) {
            comboChart.data.labels.shift();
            comboChart.data.datasets[0].data.shift();
            comboChart.data.datasets[1].data.shift();
        }
        comboChart.data.labels.push(time);
        comboChart.data.datasets[0].data.push(data.temperature);
        comboChart.data.datasets[1].data.push(data.humidity);
        comboChart.update('none');

        // Update Soil Trend
        if(soilTrendChart.data.labels.length > 50) {
            soilTrendChart.data.labels.shift();
            soilTrendChart.data.datasets[0].data.shift();
            soilTrendChart.data.datasets[1].data.shift();
        }
        soilTrendChart.data.labels.push(time);
        soilTrendChart.data.datasets[0].data.push(currentSoilPct); 
        soilTrendChart.data.datasets[1].data.push(avgTrend);
        soilTrendChart.update('none');

        // 4. UPDATE TABLE
        const table = document.getElementById('dataTable').getElementsByTagName('tbody')[0];
        const row = table.insertRow(0);
        let lBadge = lightPct > 20 ? '<span class="status-chip bg-green">Bright</span>' : '<span class="status-chip bg-blue">Dark</span>';

        row.innerHTML = `
            <td>${time}</td>
            <td>${data.temperature}°C</td>
            <td>${data.humidity}%</td>
            <td>${currentSoilPct}%</td>
            <td>${lightPct}% ${lBadge}</td>
        `;
        if(table.rows.length > 5) table.deleteRow(5);

    })
    .catch(e => {
        console.log("Waiting for data or backend server connection error:", e);
        // Treat connection failure as "OFF"
        checkSystemStatus({});
    });
}

setInterval(updateDashboard, 2000);
// <<< START CHANGE: Removed standalone checkSystemStatus interval. It's now integrated inside updateDashboard.
// <<< END CHANGE