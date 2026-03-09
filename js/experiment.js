import {config} from "./config.js";
import {generateConditions} from "./conditions.js";
import {initTargets} from "./targets.js";
import {pointCursor,areaCursor,bubbleCursor} from "./cursors.js";
import {updateTargets,updateTrialCounter} from "./ui.js";
import {distance} from "./utils.js";

export class Experiment{

    constructor(svg,participant){

        this.svg=svg;
        this.participant=participant;

        this.conditions=generateConditions();

        this.conditionIndex=0;
        this.block=1;
        this.trial=1;

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

        this.chooseNewTarget(true);

        updateTrialCounter(this.trial,config.trialsPerBlock);

    }

    chooseNewTarget(first=false){

        let newTarget=this.clickTarget;

        while(newTarget===this.clickTarget){

            newTarget=Math.floor(Math.random()*this.targets.length);

            if(first) break;

        }

        this.clickTarget=newTarget;

    }

    handleMove(mouse){

        const c=this.currentCondition();

        let captured=-1;

        const cursor=this.svg.select(".cursorCircle");

        if(c.cursorType==="POINT"){

            captured=pointCursor(mouse,this.targets);
            cursor.attr("r",0);

        }

        if(c.cursorType==="AREA"){

            captured=areaCursor(mouse,this.targets,config.areaRadius);

            cursor
                .attr("cx",mouse[0])
                .attr("cy",mouse[1])
                .attr("r",config.areaRadius);

        }

        if(c.cursorType==="BUBBLE"){

            const result=bubbleCursor(mouse,this.targets);

            captured=result.index;

            let radius=Math.min(
                result.dist,
                result.second
            );

            cursor
                .attr("cx",mouse[0])
                .attr("cy",mouse[1])
                .attr("r",radius);

        }

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

        if(this.trial>config.trialsPerBlock){

            this.nextBlock();
            return;

        }

        this.chooseNewTarget();

        updateTrialCounter(this.trial,config.trialsPerBlock);

        this.startTime=performance.now();

    }

    nextBlock(){

        this.block++;

        if(this.block>config.blocksPerCondition){

            this.finishCondition();
            return;

        }

        this.trial=1;

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