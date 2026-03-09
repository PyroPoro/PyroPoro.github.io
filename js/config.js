export const config = {

    canvasWidth:960,
    canvasHeight:500,

    numTargets:40,

    blocksPerCondition:3,
    trialsPerBlock:5,

    areaRadius:50,

    cursorTypes:["POINT","BUBBLE","AREA"],

    targetSizes:[
        {name:"SMALL",min:8,max:14},
        {name:"MEDIUM",min:15,max:22},
        {name:"LARGE",min:23,max:30}
    ],

    separations:[
        {name:"LOW",value:10},
        {name:"MEDIUM",value:25},
        {name:"HIGH",value:45}
    ]

};