export default (filter, bandwidthTarget) => {
    let decoder = new TextDecoder("utf-8")
    let encoder = new TextEncoder()
    
    filter.onstart = event => {
        console.log("started HLS playlist manifest filter")
    }
    
    let data = []
    
    filter.ondata = event => {
        console.log("HLS Data event fired")
        data.push(event.data)
    }
    
    filter.onerror = event => {
        console.error(`Error: ${filter.error} | Status: ${filter.status}`)
        filter.disconnect()
    }
    
    filter.onstop = event => {
        //let str = decoder.decode(event.data, {stream: true})
        
        let str = "";
        if (data.length == 1) {
            str = decoder.decode(data[0])
        }
        else {
            for (let i = 0; i < data.length; i++) {
                let stream = (i == data.length - 1) ? false : true
                str += decoder.decode(data[i], {stream})
            }
        }
        
        let strArr = str.split('\n')
        
        let streams = {}, 
        bandwidthRegex = /BANDWIDTH=(\d+)/i
        
        let hlsStreamList = false
        for(let line in strArr){
            let workingLine = strArr[line]
            if(workingLine.startsWith('#EXT-X-STREAM-INF')){
                hlsStreamList = true
                let bandwidthMatch = workingLine.match(bandwidthRegex)
                let bandwidth = parseInt(bandwidthMatch ? bandwidthMatch[1] : 0)
                //remove this and next line. Replace with null to maintain position in loop.
                let current = strArr.splice(line, 2, null)
                streams[bandwidth] instanceof Array ? streams[bandwidth].concat(current) : streams[bandwidth] = current;
            } 
        }
        var bandwidthsList = 
            Object.keys(streams)
                    .sort((a, b) => a - b)
                    .slice(0, 
                           Math.floor(
                               streams.length / 5 * (100 / (100 - bandwidthTarget)) 
                           ) || 1
                          )
        strArr.splice(strArr.indexOf(null), streams.length , ...bandwidthsList.map(bandwidth => streams[bandwidth]).flat())
        str = strArr.join('\n')
        
        if(hlsStreamList){console.log(str)}
        filter.write(encoder.encode(str))
        filter.close()
    }
}

