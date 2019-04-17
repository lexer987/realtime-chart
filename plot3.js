let url = "wss://www.bitmex.com/realtime?subscribe=trade:XBTUSD";
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
    dataArray = JSON.parse(e.data).data;
    console.log(dataArray);
    if (! (dataArray instanceof Array)) {
        return;
    }
    dataArray.forEach((data) => {
        let type = 'sell';
        if (data.side == 'Buy') {
            type = 'buy';
        }
        let rowData = {'time': d3.utcParse("%Y-%m-%dT%H:%M:%S.%LZ")(data.timestamp).getTime(), 'type': type, 'amount': parseFloat(data.size/data.price)};
        // df = df.push([rowData]);
        addTimeSize(rowData);
    });
    plotChart();

    // console.log(rowData);

    // console.log(blockDf.show());
});

// blockごとの取引量を入れる
function addTimeSize(row) {
    let blockTime = getBlockTime(row['time']);
    let blockRow = blockDf.getRow(blockDf.count()-1);
    if (!blockRow || blockRow.get('time_block') != blockTime) {
        console.log('not found :' + blockTime);
        blockDf = blockDf.push([blockTime, 0, 0]);
        // plotChart();
    }
    if (row['type'] == 'sell') {
        blockDf = blockDf.setRow(blockDf.count() - 1, drow => drow.set('sell_amount', drow.get('sell_amount') + row['amount']));
    } else {
        blockDf = blockDf.setRow(blockDf.count() - 1, drow => drow.set('buy_amount', drow.get('buy_amount') + row['amount']));
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
            range: [Math.min(sell_amount_range), Math.max(buy_amount_range)]
        },
        barmode: 'relative'
    };
    Plotly.newPlot('tester', [buy_plot, sell_plot]);
    Plotly.relayout('tester', layout);
}
