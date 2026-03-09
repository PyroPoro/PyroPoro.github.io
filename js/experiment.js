import {config} from "./config.js";
import {generateConditions} from "./conditions.js";
import {initTargets} from "./targets.js";
import {pointCursor,areaCursor,bubbleCursor} from "./cursors.js";
import {updateTargets} from "./ui.js";

export class Experiment{

    constructor(svg,participant){

        this.svg=svg;
        this.participant=participant;

        this.conditions=generateConditions();

        this.conditionIndex=0;
        this.block=1;
        this.trial=0;

        this.trialTimes=[];
        this.missed=0;
        this.success=0;

        this.results=[];

    }

    currentCondition(){

        return this.conditions[this.conditionIndex];

    }

    setupTargets(){

        const c=this.currentCondition();

        this.targets=initTargets(
            config.numTargets,
            c.size.min,
            c.size.max,
            c.separation.value
        );

        this.clickTarget=Math.floor(Math.random()*this.targets.length);

    }

    handleMove(mouse){

        const c=this.currentCondition();

        let captured=-1;

        if(c.cursorType==="POINT")
            captured=pointCursor(mouse,this.targets);

        if(c.cursorType==="AREA")
            captured=areaCursor(mouse,this.targets,40);

        if(c.cursorType==="BUBBLE")
            captured=bubbleCursor(mouse,this.targets);

        updateTargets(this.svg,captured,this.clickTarget);

        this.captured=captured;

    }

    handleClick(){

        if(this.captured===this.clickTarget){

            this.success++;

            const t=performance.now()-this.startTime;

            this.trialTimes.push(t);

            this.nextTrial();

        }
        else{

            this.missed++;

        }

    }

    nextTrial(){

        this.trial++;

        if(this.trial>=config.trialsPerBlock){

            this.nextBlock();
            return;

        }

        this.clickTarget=Math.floor(Math.random()*this.targets.length);

        this.startTime=performance.now();

    }

    nextBlock(){

        this.block++;

        if(this.block>config.blocksPerCondition){

            this.finishCondition();
            return;

        }

        this.trial=0;

    }

    finishCondition(){

        const accuracy=this.success/(this.success+this.missed);

        const avg=this.trialTimes.reduce((a,b)=>a+b,0)/this.trialTimes.length;

        const c=this.currentCondition();

        this.results.push({

            cursor:c.cursorType,
            size:c.size.name,
            sep:c.separation.name,
            accuracy:accuracy,
            avg:avg,
            trials:[...this.trialTimes]

        });

    }

    download(){

        let txt="participant\tcursor\tsize\tsep\tavgTime\taccuracy\n";

        this.results.forEach(r=>{

            txt+=`${this.participant}\t${r.cursor}\t${r.size}\t${r.sep}\t${r.avg}\t${r.accuracy}\n`;

        });

        txt+="\nTRIAL TIMES\n";

        this.results.forEach(r=>{

            txt+=`${r.cursor}_${r.size}_${r.sep}\t${r.trials.join("\t")}\n`;

        });

        const blob=new Blob([txt],{type:"text/plain"});
        saveAs(blob,"participant_"+this.participant+"_results.txt");

    }

}