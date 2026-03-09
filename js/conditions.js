import {config} from "./config.js";
import {shuffle} from "./utils.js";

export function generateConditions(){

    let conditions=[];

    config.cursorTypes.forEach(cursor=>{

        config.targetSizes.forEach(size=>{

            config.separations.forEach(sep=>{

                conditions.push({
                    cursorType:cursor,
                    size:size,
                    separation:sep
                });

            });

        });

    });

    return shuffle(conditions);

}