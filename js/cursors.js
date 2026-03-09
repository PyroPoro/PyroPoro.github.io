import {distance} from "./utils.js";

export function pointCursor(mouse,targets){

    let idx=-1;

    targets.forEach((t,i)=>{

        const d=distance(mouse,t[0]);

        if(d <= t[1]) idx=i;

    });

    return idx;

}

export function areaCursor(mouse,targets,radius){

    let idx=-1;

    targets.forEach((t,i)=>{

        const d=distance(mouse,t[0]);

        if(d <= t[1]+radius) idx=i;

    });

    return idx;

}

export function bubbleCursor(mouse,targets){

    let best=0;
    let min=Infinity;

    targets.forEach((t,i)=>{

        const d=distance(mouse,t[0]) - t[1];

        if(d<min){

            min=d;
            best=i;

        }

    });

    return best;

}