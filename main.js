// ─── EXPERIMENT CONFIGURATION ────────────────────────────────────────────────
const W = 960, H = 500;
const BLOCKS_PER_CONDITION = 3;
const TRIALS_PER_BLOCK = 5;
const NUM_TARGETS = 40;

const CURSOR_TYPES    = ["POINT", "BUBBLE", "AREA"];
const TARGET_SIZES    = [
  { label: "Small",  minR: 8,  maxR: 16 },
  { label: "Medium", minR: 14, maxR: 26 },
  { label: "Large",  minR: 22, maxR: 38 },
];
const SEPARATIONS     = [
  { label: "Tight",  minSep: 5  },
  { label: "Normal", minSep: 20 },
  { label: "Spread", minSep: 40 },
];
const AREA_CURSOR_RADIUS = 50;

const CURSOR_DESCRIPTIONS = {
  POINT:  "The <b>Point Cursor</b> is the standard cursor technique. You must click precisely inside a target circle to select it. No assistance is provided.",
  BUBBLE: "The <b>Bubble Cursor</b> dynamically expands to reach the nearest target. A gray circle shows its current range. It always captures the closest non-overlapping target.",
  AREA:   "The <b>Area Cursor</b> has a fixed circular selection area shown in gray. If exactly one target overlaps the area, it is captured. If the cursor is directly inside a target, that target is selected.",
};

// ─── STATE ───────────────────────────────────────────────────────────────────
let participant = "";
let conditions  = [];   // shuffled array of {cursor, size, sep}
let condIdx     = 0;    // current condition index (0–26)
let blockIdx    = 0;    // current block within condition (0–2)
let trialIdx    = 0;    // current trial within block (0–4)

let targets     = [];
let clickTarget = -1;
let prevClickTarget = -1;

// Per-trial data  [{ time, missed }]  — reset each block
let blockTrials = [];
// Per-condition data  [{ blockTrials }]  — reset each condition
let conditionData = [];
// All data  [{ condition, blocks: [{ trials }] }]
let allData     = [];

// Timing
let trialStartTime = 0;
// Miss counter in current trial (clicks on wrong target or empty)
let trialMisses = 0;

// Block-level aggregates (collected per-block for the break screen)
let blockMisses  = 0;
let blockHits    = 0;

// SVG handle
let svg = null;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function distance(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (msg) t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 1800);
}

// ─── SETUP ───────────────────────────────────────────────────────────────────
function startSetup() {
  const val = document.getElementById("participantInput").value.trim();
  if (!val || isNaN(val) || +val < 1) {
    alert("Please enter a valid participant number.");
    return;
  }
  participant = val;

  // Build all 27 conditions and shuffle
  const raw = [];
  for (const cursor of CURSOR_TYPES)
    for (const size of TARGET_SIZES)
      for (const sep of SEPARATIONS)
        raw.push({ cursor, size, sep });
  conditions = shuffle(raw);

  condIdx = 0; blockIdx = 0; trialIdx = 0;
  allData = [];
  showInstructionScreen();
}

// ─── INSTRUCTION SCREEN ───────────────────────────────────────────────────────
function showInstructionScreen() {
  const cond = conditions[condIdx];

  document.getElementById("condNum").textContent       = condIdx + 1;
  document.getElementById("instrBlockNum").textContent = blockIdx + 1;
  document.getElementById("instrParticipant").textContent = `Participant ${participant}`;
  document.getElementById("instrCursor").textContent   = cond.cursor + " Cursor";
  document.getElementById("instrSize").textContent     = cond.size.label + " Targets";
  document.getElementById("instrSep").textContent      = cond.sep.label + " Spacing";
  document.getElementById("instrDesc").innerHTML       = CURSOR_DESCRIPTIONS[cond.cursor];

  const totalBlocks = conditions.length * BLOCKS_PER_CONDITION;
  const doneBlocks  = condIdx * BLOCKS_PER_CONDITION + blockIdx;
  document.getElementById("overallProgress").style.width = (doneBlocks / totalBlocks * 100) + "%";

  showScreen("instructionScreen");
}

// ─── START BLOCK ─────────────────────────────────────────────────────────────
function startBlock() {
  const cond = conditions[condIdx];
  blockTrials = [];
  blockMisses = 0;
  blockHits   = 0;
  trialIdx    = 0;
  prevClickTarget = -1;

  // Build SVG
  buildSVG(cond);

  // Meta header
  document.getElementById("metaCursor").textContent = cond.cursor;
  document.getElementById("metaCond").textContent   = condIdx + 1;
  document.getElementById("metaBlock").textContent  = blockIdx + 1;
  updateTrialCounter();

  showScreen("experimentScreen");

  // Spawn targets
  spawnTargets(cond);
  startTrial();
}

function buildSVG(cond) {
  // Clear old SVG
  const mount = document.getElementById("svgMount");
  mount.innerHTML = "";

  svg = d3.select("#svgMount")
      .append("svg:svg")
      .attr("width", W)
      .attr("height", H)
      .style("cursor", "none");

  svg.append("rect")
      .attr("width", W).attr("height", H)
      .attr("fill", "#f8f9fa").attr("stroke", "#2a2f3f");

  // Cursor circles (behind targets)
  svg.append("circle").attr("class", "cursorCircle")
      .attr("cx", 0).attr("cy", 0).attr("r", 0)
      .attr("fill", "rgba(150,150,150,0.25)")
      .attr("stroke", "rgba(120,120,120,0.5)")
      .attr("stroke-width", 1.5)
      .attr("pointer-events", "none");

  svg.append("circle").attr("class", "cursorMorphCircle")
      .attr("cx", 0).attr("cy", 0).attr("r", 0)
      .attr("fill", "none")
      .attr("stroke", "rgba(100,180,100,0.5)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4 3")
      .attr("pointer-events", "none");

  // Event handlers
  svg.on("mousemove", function() {
    const mouse = d3.mouse(this);
    const captured = getCapture(mouse, cond.cursor);
    updateFill(captured);
  });

  svg.on("click", function() {
    const mouse   = d3.mouse(this);
    const captured = getCapture(mouse, cond.cursor);
    handleClick(captured);
  });
}

function spawnTargets(cond) {
  targets = initTargets(NUM_TARGETS, cond.size.minR, cond.size.maxR, cond.sep.minSep);

  svg.selectAll(".targetCircles").remove();
  svg.selectAll(".targetCircles")
      .data(targets).enter()
      .append("circle")
      .attr("class", "targetCircles")
      .attr("cx", d => d[0][0])
      .attr("cy", d => d[0][1])
      .attr("r",  d => d[1] - 1)
      .attr("stroke-width", 2)
      .attr("stroke", "#4ade80")
      .attr("fill", "white")
      .attr("pointer-events", "none");
}

function initTargets(num, minR, maxR, minSep) {
  const range = maxR - minR;
  const minX = maxR + 12, maxX = W - maxR - 12;
  const minY = maxR + 12, maxY = H - maxR - 12;
  const result = [];
  for (let i = 0; i < num; i++) {
    let collision = true;
    while (collision) {
      const pt  = [Math.random() * (maxX - minX) + minX, Math.random() * (maxY - minY) + minY];
      const rad = Math.random() * range + minR;
      collision = false;
      for (const t of result) {
        if (distance(pt, t[0]) < rad + t[1] + minSep) { collision = true; break; }
      }
      if (!collision) result.push([pt, rad]);
    }
  }
  return result;
}

// ─── TRIAL LOGIC ─────────────────────────────────────────────────────────────
function startTrial() {
  trialMisses = 0;
  // Pick a random click target that isn't the same as the previous
  let next = prevClickTarget;
  while (next === prevClickTarget)
    next = Math.floor(Math.random() * targets.length);
  clickTarget     = next;
  prevClickTarget = next;
  trialStartTime  = Date.now();
  updateFill(-1);
  updateTrialCounter();
}

function updateTrialCounter() {
  document.getElementById("trialCounter").textContent =
      `Trial ${trialIdx + 1} / ${TRIALS_PER_BLOCK}`;
}

function handleClick(capturedIdx) {
  if (capturedIdx === clickTarget) {
    // ── HIT ──
    const elapsed = Date.now() - trialStartTime;
    blockTrials.push({ time: elapsed, misses: trialMisses });
    blockHits++;
    trialIdx++;

    if (trialIdx >= TRIALS_PER_BLOCK) {
      finishBlock();
    } else {
      startTrial();
    }
  } else {
    // ── MISS ──
    trialMisses++;
    blockMisses++;
    showToast("⚠ Missed — click the highlighted target");
  }
}

function finishBlock() {
  // Aggregate block stats
  const times = blockTrials.map(t => t.time);
  const avgTime = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const totalClicks = blockHits + blockMisses;
  const accuracy = totalClicks > 0 ? (blockHits / totalClicks * 100).toFixed(1) : "100.0";

  // Store block data in conditionData
  conditionData.push({ trials: blockTrials.slice(), accuracy: +accuracy, avgTime });

  // Destroy SVG
  document.getElementById("svgMount").innerHTML = "";
  svg = null;

  // Show break / next block / end
  blockIdx++;

  if (blockIdx >= BLOCKS_PER_CONDITION) {
    // Condition done
    finishCondition(accuracy, avgTime);
  } else {
    // Show break screen between blocks
    document.getElementById("breakBlockNum").textContent = blockIdx; // already incremented
    document.getElementById("breakAccuracy").textContent = accuracy + "%";
    document.getElementById("breakAvgTime").textContent  = avgTime + " ms";
    document.getElementById("breakBtn").textContent = "Next Block →";
    showScreen("breakScreen");
  }
}

function onBreakContinue() {
  showInstructionScreen();
}

function finishCondition(accuracy, avgTime) {
  // Compute overall condition accuracy & avg across all blocks
  const allTrials  = conditionData.flatMap(b => b.trials);
  const condAvgTime = allTrials.length
      ? Math.round(allTrials.reduce((s, t) => s + t.time, 0) / allTrials.length) : 0;
  const totalClicks  = blockHits + blockMisses +
      conditionData.slice(0, -1).reduce((s, b) => s + b.trials.length, 0);
  const condAccuracy = (allTrials.length / (allTrials.length + conditionData.reduce((s,b)=>s+b.trials.reduce((ss,t)=>ss+t.misses,0),0)) * 100).toFixed(1);

  allData.push({
    conditionIndex: condIdx,
    condition: conditions[condIdx],
    blocks: conditionData.slice(),
    condAvgTime,
    condAccuracy,
  });

  conditionData = [];
  condIdx++;
  blockIdx  = 0;
  trialIdx  = 0;

  if (condIdx >= conditions.length) {
    showScreen("completeScreen");
  } else {
    // Show condition-end summary on the break screen
    document.getElementById("breakBlockNum").textContent = BLOCKS_PER_CONDITION + " (condition complete)";
    document.getElementById("breakAccuracy").textContent = condAccuracy + "%";
    document.getElementById("breakAvgTime").textContent  = condAvgTime + " ms";
    document.getElementById("breakBtn").textContent = "Next Condition →";
    showScreen("breakScreen");
  }
}

// ─── CURSOR TECHNIQUES ────────────────────────────────────────────────────────
function getCapture(mouse, technique) {
  if (technique === "BUBBLE") return captureBubble(mouse);
  if (technique === "POINT")  return capturePoint(mouse);
  if (technique === "AREA")   return captureArea(mouse);
  return -1;
}

function capturePoint(mouse) {
  const mp = [mouse[0], mouse[1]];
  let idx = -1;
  for (let i = 0; i < targets.length; i++) {
    if (distance(mp, targets[i][0]) <= targets[i][1]) idx = i;
  }
  svg.select(".cursorCircle").attr("cx", mouse[0]).attr("cy", mouse[1]).attr("r", 0);
  svg.select(".cursorMorphCircle").attr("cx", 0).attr("cy", 0).attr("r", 0);
  return idx;
}

function captureBubble(mouse) {
  const mp = [mouse[0], mouse[1]];
  const n  = targets.length;
  if (n === 0) return -1;

  const dists         = targets.map((t, i) => distance(mp, t[0]));
  const containDists  = targets.map((t, i) => dists[i] + t[1]);
  const intersectDists= targets.map((t, i) => dists[i] - t[1]);

  let minIdx = 0;
  for (let i = 1; i < n; i++)
    if (intersectDists[i] < intersectDists[minIdx]) minIdx = i;

  let secIdx = (minIdx + 1) % n;
  for (let i = 0; i < n; i++)
    if (i !== minIdx && intersectDists[i] < intersectDists[secIdx]) secIdx = i;

  const cursorR = Math.min(containDists[minIdx], intersectDists[secIdx]);

  svg.select(".cursorCircle")
      .attr("cx", mouse[0]).attr("cy", mouse[1]).attr("r", Math.max(0, cursorR));

  if (cursorR < containDists[minIdx]) {
    svg.select(".cursorMorphCircle")
        .attr("cx", targets[minIdx][0][0])
        .attr("cy", targets[minIdx][0][1])
        .attr("r", targets[minIdx][1] + 5);
  } else {
    svg.select(".cursorMorphCircle").attr("cx", 0).attr("cy", 0).attr("r", 0);
  }

  return minIdx;
}

function captureArea(mouse) {
  const mp = [mouse[0], mouse[1]];
  let areaIdx = -1, pointIdx = -1, numCapt = 0;
  for (let i = 0; i < targets.length; i++) {
    const d = distance(mp, targets[i][0]);
    if (d <= targets[i][1] + AREA_CURSOR_RADIUS) { areaIdx = i; numCapt++; }
    if (d <= targets[i][1]) pointIdx = i;
  }
  const captured = pointIdx > -1 ? pointIdx : (numCapt === 1 ? areaIdx : -1);

  svg.select(".cursorCircle")
      .attr("cx", mouse[0]).attr("cy", mouse[1]).attr("r", AREA_CURSOR_RADIUS);
  svg.select(".cursorMorphCircle").attr("cx", 0).attr("cy", 0).attr("r", 0);
  return captured;
}

// ─── VISUAL UPDATES ──────────────────────────────────────────────────────────
function updateFill(capturedIdx) {
  if (!svg) return;
  svg.selectAll(".targetCircles").attr("fill", function(d, i) {
    if (i === clickTarget && i === capturedIdx) return "#b91c1c";   // dark red: on target
    if (i === clickTarget)                       return "#fb923c";   // orange: this is the target
    if (i === capturedIdx)                       return "#86efac";   // light green: captured
    return "white";
  });
}

// ─── DATA DOWNLOAD ────────────────────────────────────────────────────────────
function downloadData() {
  let out = `Cursor Pointing Experiment — Participant ${participant}\n`;
  out += `Generated: ${new Date().toISOString()}\n`;
  out += `Conditions: ${allData.length}\n\n`;
  out += "=".repeat(70) + "\n\n";

  for (const entry of allData) {
    const c = entry.condition;
    out += `CONDITION ${entry.conditionIndex + 1}: Cursor=${c.cursor}  Size=${c.size.label}  Separation=${c.sep.label}\n`;
    out += `  Overall Avg Time: ${entry.condAvgTime} ms\n`;
    out += `  Overall Accuracy: ${entry.condAccuracy}%\n\n`;

    for (let bi = 0; bi < entry.blocks.length; bi++) {
      const blk = entry.blocks[bi];
      out += `  Block ${bi + 1} (accuracy: ${blk.accuracy}%, avg: ${blk.avgTime} ms)\n`;
      out += `    participant\tcondition\tblock\ttrial\tcursor\tsize\tseparation\ttime_ms\tmisses\n`;
      for (let ti = 0; ti < blk.trials.length; ti++) {
        const tr = blk.trials[ti];
        out += `    ${participant}\t${entry.conditionIndex + 1}\t${bi + 1}\t${ti + 1}\t${c.cursor}\t${c.size.label}\t${c.sep.label}\t${tr.time}\t${tr.misses}\n`;
      }
      out += "\n";
    }
    out += "-".repeat(70) + "\n\n";
  }

  const blob = new Blob([out], { type: "text/plain;charset=utf-8;" });
  saveAs(blob, `P${participant}_cursor_experiment.txt`);
}

// Bind buttons after DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  document.querySelector("#setupScreen .btn-primary")
      .addEventListener("click", startSetup);
  document.getElementById("startBlockBtn")
      .addEventListener("click", startBlock);
  document.getElementById("breakBtn")
      .addEventListener("click", onBreakContinue);
  document.querySelector("#completeScreen .btn-primary")
      .addEventListener("click", downloadData);
  document.getElementById("participantInput")
      .addEventListener("keydown", function (e) {
        if (e.key === "Enter") startSetup();
      });
});

// Keep on window for inline onclick attributes in HTML
window.startSetup      = startSetup;
window.startBlock      = startBlock;
window.onBreakContinue = onBreakContinue;
window.downloadData    = downloadData;