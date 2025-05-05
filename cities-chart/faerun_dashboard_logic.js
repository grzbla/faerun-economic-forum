// faerun_dashboard_logic.js
(() => {
  //─── 1. CONFIG ───────────────────────────────────────────────────────────────
  const keys   = ['pop','ships','wagons','bank','export','mage','mil','threat','hub','lit'];
  const labels = ['Population','Ships/day','Wagons/day','Bank (gp)','Export','Mage','Military','Threat','Hub','Literacy'];
  const columnLabelMap = keys.reduce((m,k,i) => (m[k]=labels[i], m), { index: 'Unified Index' });

  //─── 2. DATA PREP ────────────────────────────────────────────────────────────
  // normalize each metric to 0–100 and compute unified index
  const maxValues = keys.map(k => Math.max(...faerunCityData.map(d => d[k]||0)));
  const enriched = faerunCityData.map(city => {
    const norm  = keys.map((k,i) => (city[k]||0)/maxValues[i]*100);
    const index = norm.reduce((a,b)=>a+b,0)/norm.length;
    return { city: city.c, raw: city, norm, index };
  });

  //─── 3. STATE & CONTROLS ─────────────────────────────────────────────────────
  let barChart, radarChart, corChart;
  const barCtx   = document.getElementById('barChart').getContext('2d');
  const radarCtx = document.getElementById('radarChart').getContext('2d');
  const corCtx   = document.getElementById('corChart').getContext('2d');
  const barInput   = document.getElementById('barCount');
  const radarInput = document.getElementById('radarCap');
  barInput.addEventListener('input',  updateCharts);
  radarInput.addEventListener('input', updateCharts);
  const xSelect    = document.getElementById('xColumn');
  const ySelect    = document.getElementById('yColumn');
  const tbody      = document.querySelector('#faerunTable tbody');

  // map table‐column index → data key
  const colKeyMap = {
    2: 'pop', 3: 'ships', 4: 'wagons', 5: 'bank',
    6: 'export', 7: 'mage', 8: 'mil', 9: 'threat',
    10:'hub', 11:'lit'
  };

  // current sort state
  let currentSort = { key: 'index', direction: 'desc' };

  //─── 4. RENDER FUNCTIONS ─────────────────────────────────────────────────────
  function updateTable(sortedArr) {
    tbody.innerHTML = '';
    sortedArr.forEach((d,i) => {
      const r = d.raw;
      const make = (v,loc) => v!=null
        ? (loc ? v.toLocaleString() : v)
        : '';
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${i+1}</td>
        <td>${d.city}</td>
        <td>${make(r.pop, true)}</td>
        <td>${make(r.ships)}</td>
        <td>${make(r.wagons)}</td>
        <td>${make(r.bank, true)}</td>
        <td>${make(r.export)}</td>
        <td>${make(r.mage)}</td>
        <td>${make(r.mil)}</td>
        <td>${make(r.threat)}</td>
        <td>${make(r.hub)}</td>
        <td>${make(r.lit)}</td>
        <td>${make(r.why)}</td>
        <td>${make(r.who)}</td>
      `;
      tbody.appendChild(row);
    });
  }

  function updateCharts() {
    // sort enriched array by currentSort
    let sortedArr;
    if (currentSort.key === 'index') {
      sortedArr = enriched.slice().sort((a,b)=> b.index - a.index);
    } else {
      const k = currentSort.key, dir = currentSort.direction;
      sortedArr = enriched.slice().sort((a,b)=>
        dir === 'desc'
          ? (b.raw[k]||0) - (a.raw[k]||0)
          : (a.raw[k]||0) - (b.raw[k]||0)
      );
    }

    // update table to match
    updateTable(sortedArr);

    // BAR CHART (top X of sortedArr)
    const n    = +barInput.value;
    const sliceBar = sortedArr.slice(0, n);
    const barData = {
      labels: sliceBar.map(d=>d.city),
      datasets: [{
        label: columnLabelMap[currentSort.key],
        data: sliceBar.map(d =>
          currentSort.key==='index'
            ? +d.index.toFixed(1)
            : (d.raw[currentSort.key]||0)
        ),
        backgroundColor: 'rgba(255,215,0,0.6)'
      }]
    };
    const barOpts = {
      responsive:true,
      plugins:{
        legend:{ display:false },
        title:{ display:true, text: columnLabelMap[currentSort.key] }
      }
    };
    if (barChart) {
      barChart.data = barData;
      barChart.options = barOpts;
      barChart.update();
    } else {
      barChart = new Chart(barCtx, { type:'bar', data:barData, options:barOpts });
    }

    // RADAR CHART (top M of sortedArr)
    const m    = +radarInput.value;
    const sliceRad = sortedArr.slice(0, m);
    const ds   = sliceRad.map((d,i) => {
      const hue = Math.round(i * 360 / m);
      return {
        label: d.city,
        data: d.norm.map(v => +v.toFixed(0)),
        fill: true,
        borderColor: `hsl(${hue},70%,50%)`,
        backgroundColor: `hsla(${hue},70%,50%,0.2)`,
        pointBackgroundColor: `hsl(${hue},70%,50%)`,
        borderWidth: 1
      };
    });
    const radarData = { labels, datasets: ds };
    const radarOpts = {
      responsive:true,
      scales:{ r:{ beginAtZero:true, max:100 } },
      plugins:{ title:{ display:true, text:`Top ${m} by ${columnLabelMap[currentSort.key]}` } }
    };
    if (radarChart) {
      radarChart.data = radarData;
      radarChart.options = radarOpts;
      radarChart.update();
    } else {
      radarChart = new Chart(radarCtx, { type:'radar', data:radarData, options:radarOpts });
    }
  }

  //─── 5. SORTING HANDLER ───────────────────────────────────────────────────────
  document.querySelectorAll('#faerunTable th').forEach((th, idx) => {
    const key = colKeyMap[idx];
    if (!key) return;  // only metric columns
    th.style.userSelect = 'none';
    th.addEventListener('click', () => {
      if (currentSort.key === key) {
        // toggle direction
        currentSort.direction = currentSort.direction === 'desc' ? 'asc' : 'desc';
      } else {
        currentSort.key = key;
        currentSort.direction = 'desc';
      }
      updateCharts();
    });
  });

  //─── 6. CORRELATION CHART ────────────────────────────────────────────────────
  // populate selectors
  keys.forEach(k => {
    [xSelect, ySelect].forEach(sel => {
      const o = document.createElement('option');
      o.value = k; o.textContent = k;
      sel.appendChild(o);
    });
  });
  xSelect.value = keys[0];
  ySelect.value = keys[1];

  function updateCor() {
    const xk = xSelect.value, yk = ySelect.value;
    const pts = faerunCityData.map(c => ({ x: c[xk], y: c[yk], label: c.c }));
    const data = {
      datasets: [{
        label: `${xk} vs ${yk}`,
        data: pts,
        pointRadius: 4
      }]
    };
    const opts = {
      responsive:true,
      scales:{
        x:{ title:{ display:true, text:xk } },
        y:{ title:{ display:true, text:yk } }
      },
      plugins:{
        tooltip:{
          callbacks:{
            label: ctx => `${ctx.raw.label}: (${ctx.raw.x}, ${ctx.raw.y})`
          }
        }
      }
    };
    if (corChart) {
      corChart.data = data;
      corChart.options = opts;
      corChart.update();
    } else {
      corChart = new Chart(corCtx, { type:'scatter', data, options:opts });
    }
  }

  xSelect.addEventListener('change', updateCor);
  ySelect.addEventListener('change', updateCor);

  //─── 7. INITIAL RENDER ───────────────────────────────────────────────────────
  updateCharts();
  updateCor();
})();
