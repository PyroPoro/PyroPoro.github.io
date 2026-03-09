export function distance(a,b){

    const dx = b[0]-a[0];
    const dy = b[1]-a[1];

    return Math.sqrt(dx*dx + dy*dy);

}

export function shuffle(array){

    for(let i=array.length-1;i>0;i--){

        const j = Math.floor(Math.random()*(i+1));
        [array[i],array[j]] = [array[j],array[i]];

    }

    return array;

}