// 複数取引所対応の売り買いデータ
let url = "wss://www.bitmex.com/realtime?subscribe=trade:XBTUSD";
let binance_url = "wss://stream.binance.com:9443/ws/btcusdt@trade";
let bitflyer_url = "wss://ws.lightstream.bitflyer.com/json-rpc";
// let sock = new WebSocket(url);

let rangeCount = 10;
let xTickFormat='%M:%S';
let timeBlockSize = 5000;      // ms単位

// let DataFrame = dfjs.DataFrame;
// let blockDf = new DataFrame([], ['time_block', 'buy_amount', 'sell_amount']);
let columns = ['time_block', 'buy_amount', 'sell_amount'];
let isFirstPlot = true;

class TradeServer {
    constructor(options) {
        this.url = options.url;
        // this.blockDf = new DataFrame([], ['time_block', 'buy_amount', 'sell_amount']);
        this.sock = null;
        this.buy_color = options.buy_color;
        this.sell_color = options.sell_color;
        this.name = options.name;
        this.simpleDataSet = new SimpleDataSet({rangeCount: rangeCount, columns: columns});
    }
    connect() {
        this.sock = new WebSocket(this.url);
        this.sock.addEventListener('open',function(e){
            console.log('Socket 接続成功');
        });
        if (this.onMessageFunction) {
            this.sock.addEventListener('message', this.onMessageFunction());
        } else {
            this.sock.addEventListener('message', this.createOnMessageFunction());
        }
    }
    createOnMessageFunction() {
        let that = this;
        return function(e) {
            let dataArray = JSON.parse(e.data).data;
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
                that.addTimeSize(rowData);
            });
            // plotAllChart([that.getSellPlot(), that.getBuyPlot()]);
            // if (that.blockDf.count() > rangeCount) {
            //     that.blockDf = that.blockDf.slice(1, that.blockDf.count());
            // }
            // that.pm.plot();
        };
        // plotChart();
    }
    addTimeSize(row) {
        let blockTime = getBlockTime(row['time']);
        let blockRow = this.simpleDataSet.getLastRow();
        if (!blockRow || blockRow['time_block'] != blockTime) {
            console.log(this.name + ' not found :' + blockTime);
            this.simpleDataSet.pushRow({'time_block': blockTime,
                                     'sell_amount': 0,
                                    'buy_amount': 0});
            blockRow = this.simpleDataSet.getLastRow();
        }
        console.log('addTimeSize');
        let amount_type;
        if (row['type'] == 'sell') {
            amount_type = 'sell_amount';
            // this.blockDf = this.blockDf.setRow(this.blockDf.count() - 1, drow => drow.set('sell_amount', drow.get('sell_amount') + row['amount']));
        } else {
            amount_type = 'buy_amount';
            // this.blockDf = this.blockDf.setRow(this.blockDf.count() - 1, drow => drow.set('buy_amount', drow.get('buy_amount') + row['amount']));
        }
        blockRow[amount_type] += row['amount'];
        this.simpleDataSet.setLastRow(blockRow);

    }
    getSellPlot(){
        let dfDict = this.simpleDataSet.toDict();
        let timeRange = dfDict['time_block'];
        timeRange = timeRange.map(x => new Date(x));

        let sell_amount_range = dfDict['sell_amount'];
        sell_amount_range = sell_amount_range.map(x => x * -1);
        let sell_plot = {
            x: timeRange,
            y: sell_amount_range,
            type: 'bar',
            name: this.name + '_sell',
            marker: {
                color: this.sell_color
            }
        };
        return sell_plot;
    }
    getBuyPlot(){
        let dfDict = this.simpleDataSet.toDict();
        let timeRange = dfDict['time_block'] ;
        timeRange = timeRange.map(x => new Date(x));

        let buy_amount_range = dfDict['buy_amount'];
        let buy_plot = {
            x: timeRange,
            y: buy_amount_range,
            type: 'bar',
            name: this.name + '_buy',
            marker: {
                color: this.buy_color
            }
        };
        return buy_plot;
    }
    getSellBuyPlot() {
        return [this.getSellPlot(), this.getBuyPlot()];
    }
    addPlotManager(pm){
        this.pm = pm;
    }
    setOnMessageFunction(func){
        this.onMessageFunction = func;
    }
    setOnEventListener(type, func) {
        this.sock.addEventListener(type, func);
    }
}

class PlotManager {
    constructor(){
        this.servers = [];
    }
    add(server){
        this.servers.push(server);
    }
    // plot(){
    //     let plots = this.servers.map(s => s.getSellBuyPlot()).reduce(
    //         (a, c) => a.concat(c)
    //     );
    //     plotAllChart(plots);
    // }
}

// dataframejsの代わりに使う
class SimpleDataSet {
    constructor(options) {
        this.rangeCount = options.rangeCount;
        this.dataArray = [];
        this.columns = options.columns;
    }
    getLastRow(){
        return this.dataArray[this.dataArray.length-1];
    }
    setLastRow(row){
        this.dataArray[this.dataArray.length-1] = row;
    }
    pushRow(row){
        let count = this.dataArray.push(row);
        if (count > this.rangeCount) {
            this.dataArray.shift();
        }
    }
    toDict(){
        let retArray = [];
        this.columns.forEach((key) => {
            retArray[key] = this.dataArray.map(x => x[key]);
        });
        return retArray;
    }
}

let server = new TradeServer({url: url,
                              sell_color: 'red',
                              buy_color: 'blue',
                              name: 'bitmex'});
server.connect();

let server2 = new TradeServer({url: binance_url,
                               sell_color: 'orange',
                               buy_color: 'green',
                               name: 'binance'});
{
    let messageFunction = function() {
        return function(e){
            let data = JSON.parse(e.data);
            let type = 'sell';
            if (data.m) {
                type = 'buy';
            }
            let rowData = {'time': data.E, 'type': type, 'amount': parseFloat(data.q)};
            server2.addTimeSize(rowData);
            // if (server2.blockDf.count() > rangeCount) {
            //     server2.blockDf = server2.blockDf.slice(1, server2.blockDf.count());
            // }
            // server2.pm.plot();
        };
    };
    server2.setOnMessageFunction(messageFunction);
}
server2.connect();
let server3 = new TradeServer({url: bitflyer_url,
                               sell_color: 'rgb(210,105,30)',
                               buy_color: 'rgb(0,128,128)',
                               name: 'bitflyer'});

let messageFunction3 = function() {
    return function(e){
        let dataArray = JSON.parse(e.data).params.message;
        if (! (dataArray instanceof Array)) {
            return;
        }
        dataArray.forEach((data) => {
            let type = "sell";
            if (data.side == 'BUY') {
                type = 'buy';
            }
            // millsecondが7桁で送られてくる
            let regex = /\.(\d{6})(\d)Z/;
            let newTime = data.exec_date.replace(regex, '.$1Z');
            let rowData = {'time': d3.utcParse("%Y-%m-%dT%H:%M:%S.%fZ")(newTime).getTime(), 'type': type, 'amount': data.size};
            server3.addTimeSize(rowData);
        });

        // if (server3.blockDf.count() > rangeCount) {
        //     server3.blockDf = server3.blockDf.slice(1, server3.blockDf.count());
        // }
        // server3.pm.plot();
    };
};
server3.setOnMessageFunction(messageFunction3);
server3.connect();
server3.setOnEventListener("open", function(){
    let data = '{"method":"subscribe", "params": {"channel": "lightning_executions_FX_BTC_JPY"}}';
    server3.sock.send(data);
});

let pm = new PlotManager();
pm.add(server);
pm.add(server2);
pm.add(server3);
server.addPlotManager(pm);
server2.addPlotManager(pm);
server3.addPlotManager(pm);

setInterval(function(){
    let plots = pm.servers.map(s => s.getSellBuyPlot()).reduce(
            (a, c) => a.concat(c)
    );
    plotAllChart(plots);
}, 100);

function getBlockTime(time){
    return Math.floor(time - (time % timeBlockSize));
}

function plotAllChart(plots){
    console.log('plotAllCharts');
    let flatY = plots.map(data => [...data.y]).reduce(
        (a, c) => a.concat(c)
    );
    var layout = {
        xaxis: {
            // range: [Math.min(timeRange), Math.max(timeRange)],
            tickformat: xTickFormat,
        },
        yaxis: {
            range: [Math.min(flatY), Math.max(flatY)]
        },
        barmode: 'relative'
    };
    if (isFirstPlot) {

        Plotly.plot('tester', plots, layout);
        // Plotly.relayout('tester', layout);
        isFirstPlot = false;
    } else {
        let mapx = plots.map(d => d.x);
        let mapy = plots.map(d => d.y);
        console.log(plots);
        Plotly.restyle('tester', {'x': mapx,
                                  'y': mapy,
                                 });
        Plotly.relayout('tester', layout);
    }
}
