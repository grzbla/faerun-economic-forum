(function() {
    const radarMetrics = ["pop", "ships", "wagons", "bank", "export", "mage", "mil", "threat", "hub", "lit"];
    const radarBuffer = [];

    const radarCapInput = document.getElementById("radarCap");
    const radarCanvas = document.getElementById("radarChart");
    if (!radarCapInput || !radarCanvas) {
        console.error("Radar init: elements not found");
        return;
    }
    const radarCtx = radarCanvas.getContext("2d");

    const radarChart = new Chart(radarCtx, {
        type: 'radar',
        data: {
            labels: radarMetrics,
            datasets: []
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true } },
            scales: {
                r: { beginAtZero: true }
            }
        }
    });

    function getRadarColor(index, alpha = 1) {
        const colors = [
            'rgba(255, 99, 132, ALPHA)',
            'rgba(54, 162, 235, ALPHA)',
            'rgba(255, 206, 86, ALPHA)',
            'rgba(75, 192, 192, ALPHA)',
            'rgba(153, 102, 255, ALPHA)',
            'rgba(255, 159, 64, ALPHA)'
        ];
        return colors[index % colors.length].replace('ALPHA', alpha);
    }

    function createDataset(city, index) {
        const values = radarMetrics.map(metric => city[metric]);
        return {
            label: city.c,
            data: values,
            fill: true,
            borderColor: getRadarColor(index),
            backgroundColor: getRadarColor(index, 0.2),
            pointBackgroundColor: getRadarColor(index)
        };
    }

    function updateRadarChart() {
        radarChart.data.datasets = radarBuffer.map((city, i) => createDataset(city, i));
        radarChart.update();
    }

    // Expose toggleRadar so faerun_dashboard_logic.js can call it
    window.toggleRadar = function(city) {
        const rowEl = city.row;
        if (!rowEl) return;
        const idx = radarBuffer.findIndex(c => c.c === city.c);
        if (idx > -1) {
            radarBuffer.splice(idx, 1);
            rowEl.classList.remove("selected");
        } else {
            const cap = parseInt(radarCapInput.value, 10) || Infinity;
            if (radarBuffer.length >= cap) {
                const removed = radarBuffer.shift();
                removed.row.classList.remove("selected");
            }
            radarBuffer.push(city);
            rowEl.classList.add("selected");
        }
        updateRadarChart();
    };
})();