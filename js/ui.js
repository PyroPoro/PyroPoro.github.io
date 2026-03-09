import {config} from "./config.js";

export function createSVG(){

    const svg=d3.select("#experimentPanel")
        .append("svg")
        .attr("width",config.canvasWidth)
        .attr("height",config.canvasHeight);

    svg.append("rect")
        .attr("width",config.canvasWidth)
        .attr("height",config.canvasHeight)
        .attr("fill","white")
        .attr("stroke","black");

    return svg;

}

export function drawTargets(svg,targets){

    svg.selectAll(".targetCircles")
        .data(targets)
        .enter()
        .append("circle")
        .attr("class","targetCircles")
        .attr("cx",d=>d[0][0])
        .attr("cy",d=>d[0][1])
        .attr("r",d=>d[1]-1)
        .attr("stroke","limegreen")
        .attr("stroke-width",2)
        .attr("fill","white");

}

export function updateTargets(svg,captured,target){

    svg.selectAll(".targetCircles")
        .attr("fill",(d,i)=>{

            if(i===target && i===captured) return "darkred";
            if(i===target) return "lightsalmon";
            if(i===captured) return "limegreen";

            return "white";

        });

}