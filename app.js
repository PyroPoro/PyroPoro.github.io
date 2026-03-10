// ─── CONFIGURATION ──────────────────────────────────────────────────────────
const W = 960, H = 500;
const BLOCKS_PER_CONDITION = 3;
const TRIALS_PER_BLOCK = 5;
const NUM_TARGETS = 40;
const AREA_CURSOR_RADIUS = 50;

const CURSOR_TYPES = ["POINT", "BUBBLE", "AREA"];
const TARGET_SIZES = [
  { label: "Small",  minR: 8,  maxR: 12 },
  { label: "Medium", minR: 16, maxR: 22 },
  { label: "Large",  minR: 28, maxR: 36 }
];
const SEPARATIONS = [
  { label: "Tight",  minSep: 5 },
  { label: "Normal", minSep: 25 },
  { label: "Spread", minSep: 50 }
];

const CURSOR_DESCRIPTIONS = {
  POINT:  "Standard cursor. Click exactly inside the orange circle to select it.",
  BUBBLE: "The cursor expands dynamically to capture the nearest target. The gray ring shows the reach.",
  AREA:   "A fixed circular area (gray) selects a target if it's the only one inside, or if you click directly on a target."
};

// ─── STATE ───────────────────────────────────────────────────────────────────
let participant = "";
let conditions = [];
let condIdx = 0, blockIdx = 0, trialIdx = 0;
let targets = [], clickTarget = -1, prevClickTarget = -1;
let trialStartTime = 0, trialMisses = 0;
let blockHits = 0, blockMisses = 0;
let blockTrials = [], conditionData = [], allData = [];
let svg = null;

// ─── CORE LOGIC ──────────────────────────────────────────────────────────────
function startSetup() {
  const val = document.getElementById("participantInput").value.trim();
  if (!val) return alert("Enter participant number");
  participant = val;

  // Generate 27 conditions (3x3x3)
  const raw = [];
  CURSOR_TYPES.forEach(c => {
    TARGET_SIZES.forEach(s => {
      SEPARATIONS.forEach(sep => {
        raw.push({ cursor: c, size: s, sep: sep });
      });
    });
  });
  conditions = shuffle(raw);
  showInstructionScreen();
}

function showInstructionScreen() {
  const cond = conditions[condIdx];
  document.getElementById("instrParticipant").textContent = `Participant: ${participant}`;
  document.getElementById("condNum").textContent = condIdx + 1;
  document.getElementById("instrBlockNum").textContent = blockIdx + 1;
  document.getElementById("instrCursor").textContent = cond.cursor;
  document.getElementById("instrSize").textContent = cond.size.label;
  document.getElementById("instrSep").textContent = cond.sep.label;
  document.getElementById("instrDesc").innerHTML = "Cursor Description: " + CURSOR_DESCRIPTIONS[cond.cursor];

  const progress = (condIdx / 27) * 100;
  document.getElementById("overallProgress").style.width = progress + "%";
  showScreen("instructionScreen");
}

function startBlock() {
  const cond = conditions[condIdx];
  blockTrials = []; blockMisses = 0; blockHits = 0; trialIdx = 0;
  prevClickTarget = -1;

  setupSVG(cond);
  document.getElementById("metaCond").textContent = condIdx + 1;
  document.getElementById("metaBlock").textContent = blockIdx + 1;
  document.getElementById("metaCursor").textContent = cond.cursor;

  spawnTargets(cond);
  showScreen("experimentScreen");
  startTrial();
}

function startTrial() {
  trialMisses = 0;
  let next = Math.floor(Math.random() * targets.length);
  while (next === prevClickTarget) next = Math.floor(Math.random() * targets.length);

  clickTarget = next;
  prevClickTarget = next;
  trialStartTime = Date.now();
  updateTrialCounter();
  updateFill(-1);
}

function handleClick(capturedIdx) {
  if (capturedIdx === clickTarget) {
    const elapsed = Date.now() - trialStartTime;
    blockTrials.push({ time: elapsed, misses: trialMisses });
    blockHits++;
    trialIdx++;

    if (trialIdx >= TRIALS_PER_BLOCK) finishBlock();
    else startTrial();
  } else {
    trialMisses++;
    blockMisses++;
    showToast("Missed! Click the highlighted target.");
  }
}

// ─── CURSOR CALCULATIONS ─────────────────────────────────────────────────────
function getCapture(mouse, type) {
  const m = [mouse[0], mouse[1]];
  const cursorElement = svg.select(".cursorVis");

  // Shared behavior: move the visual aid to the mouse position
  cursorElement.attr("cx", m[0]).attr("cy", m[1]);

  if (type === "POINT") {
    cursorElement.attr("r", 0); // No circle for Point
    for (let i = 0; i < targets.length; i++) {
      if (dist(m, targets[i].pos) <= targets[i].r) return i;
    }
    return -1;
  }

  if (type === "BUBBLE") {
    const d_i = targets.map(t => dist(m, t.pos));
    const interact = targets.map((t, i) => d_i[i] - t.r);
    const contain = targets.map((t, i) => d_i[i] + t.r);

    let nearest = 0;
    for (let i = 1; i < targets.length; i++)
      if (interact[i] < interact[nearest]) nearest = i;

    let second = (nearest === 0 ? 1 : 0);
    for (let i = 0; i < targets.length; i++) {
      if (i !== nearest && interact[i] < interact[second]) second = i;
    }

    const bubbleR = Math.min(contain[nearest], interact[second]);
    cursorElement.attr("r", bubbleR);

    return nearest;
  }

  if (type === "AREA") {
    cursorElement.attr("r", AREA_CURSOR_RADIUS);

    let insideIdx = -1, overlapCount = 0, lastOverlap = -1;
    for (let i = 0; i < targets.length; i++) {
      const d = dist(m, targets[i].pos);
      if (d <= targets[i].r) insideIdx = i;
      if (d <= targets[i].r + AREA_CURSOR_RADIUS) {
        overlapCount++;
        lastOverlap = i;
      }
    }
    return insideIdx !== -1 ? insideIdx : (overlapCount === 1 ? lastOverlap : -1);
  }
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function setupSVG(cond) {
  const mount = document.getElementById("svgMount");
  mount.innerHTML = "";

  // Create the SVG
  svg = d3.select("#svgMount").append("svg")
      .attr("width", W)
      .attr("height", H);

  // Background rect - ensure it doesn't have a 'none' cursor
  svg.append("rect")
      .attr("width", W)
      .attr("height", H)
      .attr("fill", "#fafafa")
      .style("cursor", "default");

  // Range indicator circle (The gray circle)
  // IMPORTANT: pointer-events is 'none' so it doesn't steal the mouse focus
  svg.append("circle")
      .attr("class", "cursorVis")
      .attr("fill", "rgba(128, 128, 128, 0.15)")
      .attr("stroke", "#999")
      .attr("stroke-width", 1)
      .attr("pointer-events", "none");

  // Attach listeners to the SVG itself
  svg.on("mousemove", function() {
    const mouse = d3.mouse(this);
    const captured = getCapture(mouse, cond.cursor);
    updateFill(captured);
  }).on("click", function() {
    const mouse = d3.mouse(this);
    const captured = getCapture(mouse, cond.cursor);
    handleClick(captured);
  });
}

function spawnTargets(cond) {
  targets = [];
  for (let i = 0; i < NUM_TARGETS; i++) {
    let attempts = 0, collision = true, p, r;
    while (collision && attempts < 100) {
      r = Math.random() * (cond.size.maxR - cond.size.minR) + cond.size.minR;
      p = [Math.random() * (W - 2 * r) + r, Math.random() * (H - 2 * r) + r];
      collision = targets.some(t => dist(p, t.pos) < (r + t.r + cond.sep.minSep));
      attempts++;
    }
    if (!collision) targets.push({ pos: p, r: r });
  }

  svg.selectAll(".target").data(targets).enter().append("circle").attr("class", "target")
      .attr("cx", d => d.pos[0]).attr("cy", d => d.pos[1]).attr("r", d => d.r)
      .attr("stroke", "#333").attr("fill", "white");
}

function finishBlock() {
  const avgTime = Math.round(blockTrials.reduce((a, b) => a + b.time, 0) / TRIALS_PER_BLOCK);
  const acc = ((blockHits / (blockHits + blockMisses)) * 100).toFixed(1);

  conditionData.push({ trials: blockTrials, accuracy: acc, avgTime: avgTime });

  document.getElementById("breakAccuracy").textContent = acc + "%";
  document.getElementById("breakAvgTime").textContent = avgTime + " ms";

  blockIdx++;
  if (blockIdx >= BLOCKS_PER_CONDITION) {
    document.getElementById("breakBtn").textContent = "Next Condition →";
  } else {
    document.getElementById("breakBtn").textContent = "Next Block →";
  }

  showScreen("breakScreen");
}

function onBreakContinue() {
  if (blockIdx >= BLOCKS_PER_CONDITION) {
    // Condition finished - let's aggregate all 3 blocks
    const totalTrials = conditionData.flatMap(d => d.trials);
    const totalMisses = totalTrials.reduce((a, b) => a + b.misses, 0);
    const totalHits = totalTrials.length; // Each entry in totalTrials is a success

    const cond = conditions[condIdx];

    allData.push({
      cursor: cond.cursor,
      sizeLabel: cond.size.label, // Explicitly store the label for JASP
      sepLabel: cond.sep.label,   // Explicitly store the label for JASP
      trials: totalTrials,
      hits: totalHits,
      misses: totalMisses
    });

    conditionData = [];
    blockIdx = 0;
    condIdx++;

    if (condIdx >= 27) showScreen("completeScreen");
    else showInstructionScreen();
  } else {
    showInstructionScreen();
  }
}

function downloadData() {
  const cursors = ["POINT", "BUBBLE", "AREA"];
  const sizes = ["Small", "Medium", "Large"];
  const seps = ["Tight", "Normal", "Spread"];

  let csv = "ParticipantID";
  let conditionCols = [];

  // 1. Create Headers
  cursors.forEach(c => {
    sizes.forEach(sz => {
      seps.forEach(sp => {
        const base = `${c}_${sz}_${sp}`;
        conditionCols.push({cursor: c, size: sz, sep: sp});
        csv += `,${base}_Time,${base}_Acc`;
      });
    });
  });
  csv += "\n";

  // 2. Add Data Row
  csv += participant;

  conditionCols.forEach(col => {
    // Look in 'allData' (the state variable) for a match
    const match = allData.find(r =>
        r.cursor === col.cursor &&
        r.sizeLabel === col.size &&
        r.sepLabel === col.sep
    );

    if (match && match.trials.length > 0) {
      const avgTime = Math.round(match.trials.reduce((a, b) => a + b.time, 0) / match.trials.length);
      const accuracy = ((match.hits / (match.hits + match.misses)) * 100).toFixed(1);
      csv += `,${avgTime},${accuracy}`;
    } else {
      csv += ",N/A,N/A";
    }
  });

  // 3. Trigger Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `P${participant}_RM_ANOVA.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function updateFill(capturedIdx) {
  if (!svg) return;
  svg.selectAll(".target").attr("fill", (d, i) => {
    if (i === clickTarget) return "#fb923c"; // Target is Orange
    if (i === capturedIdx) return "#ddd";    // Hover/Captured is Light Gray
    return "white";
  }).attr("stroke", (d, i) => (i === clickTarget && i === capturedIdx) ? "#ef4444" : "#333")
      .attr("stroke-width", (d, i) => (i === clickTarget && i === capturedIdx) ? 4 : 1);
}
function updateTrialCounter() { document.getElementById("trialCounter").textContent = `Trial ${trialIdx + 1} / ${TRIALS_PER_BLOCK}`; }
function dist(a, b) { return Math.sqrt(Math.pow(a[0]-b[0], 2) + Math.pow(a[1]-b[1], 2)); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function showToast(m) { const t = document.getElementById("toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2000); }