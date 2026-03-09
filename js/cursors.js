import {distance} from "./utils.js";

export function pointCursor(mouse,targets){

    let idx=-1;

    targets.forEach((t,i)=>{

        if(distance(mouse,t[0])<=t[1]) idx=i;

    });

    return idx;

}

export function areaCursor(mouse,targets,radius){

    let idx=-1;

    targets.forEach((t,i)=>{

        if(distance(mouse,t[0])<=t[1]+radius) idx=i;

    });

    return idx;

}

export function bubbleCursor(mouse,targets){

    let minIndex=0;

    let minDist=Infinity;
    let secondDist=Infinity;

    targets.forEach((t,i)=>{

        const d=distance(mouse,t[0]);

        if(d<minDist){

            secondDist=minDist;
            minDist=d;
            minIndex=i;

        }else if(d<secondDist){

            secondDist=d;

        }

    });

    return {index:minIndex,dist:minDist,second:secondDist};

}