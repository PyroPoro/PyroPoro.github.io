import {createSVG,drawTargets} from "./ui.js";
import {Experiment} from "./experiment.js";

const participant=prompt("Enter participant number:");

const svg=createSVG();

const exp=new Experiment(svg,participant);

const panel=document.getElementById("instructionPanel");

function showInstruction(){

    const c=exp.currentCondition();

    panel.innerHTML=`

<h2>Cursor Selection Experiment</h2>

<p><b>Participant:</b> ${participant}</p>

<p><b>Cursor Type:</b> ${c.cursorType}</p>

<p><b>Target Size:</b> ${c.size.name}</p>

<p><b>Separation:</b> ${c.separation.name}</p>

<button id="startBtn">Start Block ${exp.block}</button>

`;

    document.getElementById("startBtn").onclick=startBlock;

}

function showBreak(){

    panel.innerHTML=`

<h3>Block Complete</h3>

<button id="nextBlock">Next Block</button>

`;

    document.getElementById("nextBlock").onclick=startBlock;

}

function startBlock(){

    panel.innerHTML="";

    exp.setupTargets();

    drawTargets(svg,exp.targets);

    exp.startTime=performance.now();

}

svg.on("mousemove",function(){

    const mouse=d3.mouse(this);

    exp.handleMove(mouse);

});

svg.on("click",function(){

    exp.handleClick();

});

showInstruction();