import {distance} from "./utils.js";
import {config} from "./config.js";

export function initTargets(numTargets,minRadius,maxRadius,minSep){

    const targets=[];

    const minX=maxRadius+10;
    const maxX=config.canvasWidth-maxRadius-10;

    const minY=maxRadius+10;
    const maxY=config.canvasHeight-maxRadius-10;

    while(targets.length<numTargets){

        const pt=[
            Math.random()*(maxX-minX)+minX,
            Math.random()*(maxY-minY)+minY
        ];

        const rad=Math.random()*(maxRadius-minRadius)+minRadius;

        let collision=false;

        for(let t of targets){

            if(distance(pt,t[0])<rad+t[1]+minSep){
                collision=true;
                break;
            }

        }

        if(!collision) targets.push([pt,rad]);

    }

    return targets;

}