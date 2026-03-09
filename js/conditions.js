import {config} from "./config.js";
import {shuffle} from "./utils.js";

export function generateConditions(){

    let conditions=[];

    config.cursorTypes.forEach(c=>{

        config.targetSizes.forEach(size=>{

            config.separations.forEach(sep=>{

                conditions.push({
                    cursorType:c,
                    size:size,
                    separation:sep
                });

            });

        });

    });

    return shuffle(conditions);

}