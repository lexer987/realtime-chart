let url = "wss://stream.binance.com:9443/ws/btcusdt@trade";
let sock = new WebSocket(url);

let timeRange = [];
let priceRange = [];
let rangeCount = 10;
let minPrice = 0;
let maxPrice = 0;
let xTickFormat='%M:%S';
let timeBlockSize = 5000;      // ms単位

let DataFrame = dfjs.DataFrame;
let df = new DataFrame([], ['time', 'type', 'amount']);
let blockDf = new DataFrame([], ['time_block', 'buy_amount', 'sell_amount']);
sock.addEventListener('open',function(e){
    console.log('Socket 接続成功');
});

// 売り買い量
sock.addEventListener('message',function(e){
    data = JSON.parse(e.data);
    let type = 'sell';
    if (data.m) {
        type = 'buy';
    }
    let rowData = {'time': data.E, 'type': type, 'amount': parseFloat(data.q)};
    df = df.push([rowData]);
    // console.log(data);
    // console.log(rowData);
    addTimeSize(rowData);
    // console.log(blockDf.show());
});

// blockごとの取引量を入れる
function addTimeSize(row) {
    let blockTime = getBlockTime(row['time']);
    let blockRow = blockDf.find({'time_block': blockTime});
    if (!blockRow) {
        console.log('not found :' + blockTime);
        blockDf = blockDf.push([blockTime, 0, 0]);
        plotChart();
        blockRow = blockDf.find({'time_block': blockTime});
    }
    if (row['type'] == 'sell') {
        blockRow = blockRow.set('sell_amount', blockRow.get('sell_amount') + row['amount']);
        blockDf = blockDf.setRow(blockDf.count() - 1, row => blockRow);
    } else {
        blockRow = blockRow.set('buy_amount', blockRow.get('buy_amount') + row['amount']);
        blockDf = blockDf.setRow(blockDf.count() - 1, row => blockRow);
    }
}

function getBlockTime(time){
    return Math.floor(time - (time % timeBlockSize));
}

function plotChart(){
    console.log('plot chart');
    if (blockDf.count() > rangeCount) {
        blockDf = blockDf.slice(1, blockDf.count());
    }

    let timeRange = blockDf.toDict()['time_block'] ;
    timeRange = timeRange.map(x => new Date(x));

    let sell_amount_range = blockDf.toDict()['sell_amount'];
    let buy_amount_range = blockDf.toDict()['buy_amount'];
    sell_amount_range = sell_amount_range.map(x => x * -1);
    var sell_plot = {
        x: timeRange,
        y: sell_amount_range,
        type: 'bar',
        name: 'sell',
        marker: {
            color: 'red'
        }
    };
    var buy_plot = {
        x: timeRange,
        y: buy_amount_range,
        type: 'bar',
        name: 'buy',
        marker: {
            color: 'blue'
        }
    };
    var layout = {
        xaxis: {
            // range: [Math.min(timeRange), Math.max(timeRange)],
            tickformat: xTickFormat,
        },
        yaxis: {
            range: [Math.min(sell_amount_range), Math.max(sell_amount_range)]
        },
        barmode: 'relative'
    };
    Plotly.newPlot('tester', [buy_plot, sell_plot]);
    Plotly.relayout('tester', layout);
}
