let url = "wss://stream.binance.com:9443/ws/btcusdt@ticker";
let sock = new WebSocket(url);

let timeRange = [];
let priceRange = [];
let rangeCount = 100;
let minPrice = 0;
let maxPrice = 0;
let xTickFormat='%M:%S';
let format = d3.timeFormat("%M:%S");
sock.addEventListener('open',function(e){
    console.log('Socket 接続成功');
});

// priceのline chart
sock.addEventListener('message',function(e){
    data = JSON.parse(e.data);
    // console.log(new Date(data.E * 1000));
    // console.log(d3.utcFormat("%Y-%m-%dT%H:%M:%S.%LZ")(data.E));
    timeRange.push(new Date(data.E));
    priceRange.push(data.o);
    if (timeRange.length > rangeCount){
        timeRange.shift();
    }
    if (priceRange.length > rangeCount){
        priceRange.shift();
    }
    var my_plot = {
        x: timeRange,
        y: priceRange,
        type: 'scatter'
    };
    var layout = {
        xaxis: {
            // range: [Math.min(timeRange), Math.max(timeRange)],
            tickformat: xTickFormat,
        },
        yaxis: {
            range: [Math.min(priceRange), Math.max(priceRange)]
        }
    };
    // console.log(timeRange);
    // console.log(d3.utcFormat("%Y-%m-%dT%H:%M:%S.%LZ")(data.E));
    // console.log(data.o);
    Plotly.react('tester', [my_plot]);
    Plotly.relayout('tester', layout);
});
