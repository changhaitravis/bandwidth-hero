export default (filter, bandwidthTarget) => {
    let decoder = new TextDecoder("utf-8")
    let encoder = new TextEncoder()
    
    filter.onstart = event => {
        console.log("started HLS playlist manifest filter");
    }
    
    let data = []
    
    filter.ondata = event => {
        console.log("HLS Data event fired");
        data.push(event.data)
    }
    
    filter.onerror = event => {
        console.error(`Error: ${filter.error} | Status: ${filter.status}`);
        filter.disconnect()
    }
    
    filter.onstop = event => {
        //let str = decoder.decode(event.data, {stream: true})
        
        let str = "";
        if (data.length == 1) {
            str = decoder.decode(data[0]);
        }
        else {
            for (let i = 0; i < data.length; i++) {
                let stream = (i == data.length - 1) ? false : true;
                str += decoder.decode(data[i], {stream});
            }
        }
        
        let strArr = str.split('\n')
        
        let lowestBandwidthMem, 
        bandwidthRegex = /BANDWIDTH=(\d+)/i
        
        let hlsStreamList = false
        for(let line in strArr){
            let workingLine = strArr[line]
            if(workingLine.startsWith('#EXT-X-STREAM-INF')){
                hlsStreamList = true
                let bandwidthMatch = workingLine.match(bandwidthRegex)
                let bandwidth = parseInt(bandwidthMatch ? bandwidthMatch[1] : 0);
                if(bandwidth >= bandwidthTarget ){
                    //remove this and next line
                    let current = strArr.splice(line, 2, `#REMOVED BY BANDWIDTH HERO:BANDWIDTH=${bandwidth}`)
                    if(!lowestBandwidthMem || bandwidth < lowestBandwidthMem.bandwidth ){
                        lowestBandwidthMem = { "bandwidth": bandwidth, "lines": current }
                    }else if(lowestBandwidthMem && bandwidth === lowestBandwidthMem.bandwidth){
                        lowestBandwidthMem.lines = lowestBandwidthMem.lines.concat(current)
                    }
                }
            } 
        }
        
        if(lowestBandwidthMem && lowestBandwidthMem.bandwidth > bandwidthTarget){
            strArr = strArr.concat(lowestBandwidthMem.lines)
        }
        
        str = strArr.join('\n')
        
        if(hlsStreamList){console.log(str)}
        filter.write(encoder.encode(str))
        filter.close()
    }
}

