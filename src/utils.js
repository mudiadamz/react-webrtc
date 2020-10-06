export function randomId() {
    let min=1000000;
    let max=9999999;
    if (min > max) {
        let temp = max;
        max = min;
        min = max;
    }
    if (min <= 0) {
        return Math.floor(Math.random() * (max + Math.abs(min) + 1)) + min;
    } else {
        return Math.floor(Math.random() * max) + min;
    }
}

export function filterDuplicateId(users){
    return  Object.values(users.reduce((acc,cur)=>Object.assign(acc,{[cur.id]:cur}),{}));
}

export function getCurrentTime(){
    return new Date().getTime();
}
