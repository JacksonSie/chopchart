// 計算交易日（排除週末）
function calculateTradingDays(fromDate, days) {
    const result = [];
    let currentDate = new Date(fromDate);
    let addedDays = 0;

    // 往前推算交易日
    while (addedDays < days) {
        currentDate.setDate(currentDate.getDate() - 1);

        // 排除週末 (0=週日, 6=週六)
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
            result.unshift(new Date(currentDate));
            addedDays++;
        }
    }

    return result;
}

// 設定預設日期範圍（最近20個交易日）
function setDefaultDateRange() {
    const today = new Date();
    const tradingDays = calculateTradingDays(today, 20);

    const startDate = tradingDays[0];
    const endDate = today;

    // 格式化為 YYYY-MM-DD
    document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
}

// 快速篩選功能
function setQuickFilter(days) {
    if (days === 0) {
        // 顯示全部資料
        if (allData.length > 0) {
            const firstDate = new Date(allData[0].date);
            const lastDate = new Date(allData[allData.length - 1].date);

            document.getElementById('startDate').value = firstDate.toISOString().split('T')[0];
            document.getElementById('endDate').value = lastDate.toISOString().split('T')[0];
        }
    } else {
        // 顯示最近N個交易日
        const today = new Date();
        const tradingDays = calculateTradingDays(today, days);

        document.getElementById('startDate').value = tradingDays[0].toISOString().split('T')[0];
        document.getElementById('endDate').value = today.toISOString().split('T')[0];
    }

    applyDateFilter();
}

// 套用日期篩選
function applyDateFilter() {
    const startDate = new Date(new Date(document.getElementById('startDate').value).setHours(0, 0, 0, 0));
    const endDate = new Date(new Date(document.getElementById('endDate').value).setHours(0, 0, 0, 0))

    if (startDate > endDate) {
        alert('起始日期不能晚於結束日期！');
        return;
    }

    // 篩選資料
    filteredData = allData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
    });



    // 更新所有圖表
    updateAllCharts();
}

function findExtremes(dataArr, margin = 0, round = 1) {
    let max = Math.max(...dataArr);
    let min = Math.min(...dataArr);
    //let maxIndex = dataArr.indexOf(max);
    //let minIndex = dataArr.indexOf(min);
    return {
        max: Math.round(max * (1 + margin) / round) * round,
        min: Math.round(min * (1 - margin) / round) * round,
    };
}

function processDataAndCreateCharts(rawData) {
    const headers = rawData[0];
    const dataRows = rawData.slice(1);

    // 找出欄位索引
    const dateIndex = headers.findIndex(h => h.includes('date') || h.includes('日期') || h === 'date');
    const foreignBuyIndex = headers.findIndex(h => h.includes('外資'));
    const marginLongIndex = headers.findIndex(h => h.includes('資增減'));
    const marginShortIndex = headers.findIndex(h => h.includes('券增減'));
    const foreignFutureLongIndex = headers.findIndex(h => h.includes('外資期貨未平倉'));
    const foreignFutureShortIndex = headers.findIndex(h => h.includes('外資期貨未平倉'))+1;
    const foreignOpCallIndex = headers.findIndex(h => h.includes('外資選擇權\n買權未平倉'));
    const foreignOpPutIndex = headers.findIndex(h => h.includes('外資選擇權\n賣權未平倉'));
    const indexCloseIndex = headers.findIndex(h => h.includes('收盤') || h.includes('指數'));
    
    console.log(headers)


    // 處理並儲存所有資料
    allData = dataRows.map(row => ({
        date: row[dateIndex],
        foreignBuy: parseFloat(row[foreignBuyIndex].replaceAll(',','')) || 0,
        marginLong: parseFloat(row[marginLongIndex].replaceAll(',','')) || 0,
        marginShort: parseFloat(row[marginShortIndex].replaceAll(',','')) || 0,
        foreignFutureLong: parseFloat(row[foreignFutureLongIndex].replaceAll(',','')) || 0,
        foreignFutureShort: parseFloat(row[foreignFutureShortIndex].replaceAll(',','')) || 0,
        foreignOpCall: parseFloat(row[foreignOpCallIndex].replaceAll(',','')) || 0,
        foreignOpPut: parseFloat(row[foreignOpPutIndex].replaceAll(',','')) || 0,
        indexClose: parseFloat(row[indexCloseIndex].replaceAll(',','')) || 0,
        rawRow: row // 保留原始資料供其他用途
    })).filter(item => item.date && item.date.trim() !== ''); // 過濾空資料

    // 按日期排序
    allData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 設定預設日期範圍
    setDefaultDateRange();

    // 初始化圖表（使用預設篩選）
    applyDateFilter();
}

// 更新所有圖表
function updateAllCharts() {
    if (filteredData.length === 0) {
        alert('選定日期範圍內沒有資料！');
        return;
    }

    // 如果圖表已存在，先銷毀
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    
    // 重新創建圖表
    charts.foreign = createForeignChart(filteredData);
    charts.margin = createMarginChart(filteredData);
    charts.futures = createFuturesChart(filteredData);
    charts.options = createOptionsChart(filteredData);

    console.log(`已載入 ${filteredData.length} 筆資料`);
}

// 外資買賣超圖表
function createForeignChart(data) {
    const ctx = document.getElementById('foreignChart').getContext('2d');

    const extreme = findExtremes(data.map(x => x.indexClose), 0.01, 100);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.date.length > 10 ? d.date.substring(5) : d.date),
            datasets: [{
                label: '外資買賣超',
                data: data.map(d => d.foreignBuy),
                backgroundColor: data.map(d => d.foreignBuy >= 0 ? 'rgba(255, 99, 132, 0.7)' : 'rgba(75, 192, 192, 0.7)'),
                borderColor: data.map(d => d.foreignBuy >= 0 ? 'rgba(255, 99, 132, 1)' : 'rgba(75, 192, 192, 1)'),
                borderWidth: 1,
                yAxisID: 'y'
            }, {
                label: '加權指數',
                type: 'line',
                data: data.map(d => d.indexClose),
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                borderWidth: 2,
                fill: false,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: {
                    display: true,
                    text: '外資買賣超'
                },
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `日期: ${data[context[0].dataIndex].date}`;
                        },
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return `外資買賣超: ${context.parsed.y.toLocaleString()} 億`;
                            } else {
                                return `加權指數: ${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                },
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '日期'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '  (億)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '加權指數'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    max: extreme.max,
                    min: extreme.min,
                }
            }
        }
    });
}

// 資券變化圖表
function createMarginChart(data) {
    const ctx = document.getElementById('marginChart').getContext('2d');
    const extreme = findExtremes(data.map(x => x.indexClose), 0.01, 100);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.date.length > 10 ? d.date.substring(5) : d.date),
            datasets: [{
                label: '資增減(億)',
                data: data.map(d => d.marginLong),
                backgroundColor: 'rgba(255, 99, 132, 0.7)',
                yAxisID: 'y'
            }, {
                label: '券增減(千張)',
                data: data.map(d => d.marginShort/1000),
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                yAxisID: 'y'
            }, {
                label: '加權指數',
                type: 'line',
                data: data.map(d => d.indexClose),
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                fill: false,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '資券變化'
                }
                ,tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `日期: ${data[context[0].dataIndex].date}`;
                        },
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return `資增減: ${context.parsed.y.toLocaleString()} 億`;
                            } else if(context.datasetIndex === 1){
                                return `券增減: ${context.parsed.y.toLocaleString()} 千張`;
                            } else {
                                return `加權指數: ${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '資券變化'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '加權指數'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    max: extreme.max,
                    min: extreme.min,
                }
            }
        }
    });
}

// 外資期貨部位圖表
function createFuturesChart(data) {
    const ctx = document.getElementById('futuresChart').getContext('2d');
    const extreme = findExtremes(data.map(x => x.indexClose), 0.01, 100);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.date.length > 10 ? d.date.substring(5) : d.date),
            datasets: [{
                label: '期貨多單',
                data: data.map(d => d.foreignFutureLong),
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                yAxisID: 'y'
            }, {
                label: '期貨空單',
                data: data.map(d => d.foreignFutureShort),
                backgroundColor: 'rgba(255, 99, 132, 0.7)',
                yAxisID: 'y'
            }, {
                label: '加權指數',
                type: 'line',
                data: data.map(d => d.indexClose),
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                fill: false,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '外資期貨部位'
                },tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `日期: ${data[context[0].dataIndex].date}`;
                        },
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return `多單: ${context.parsed.y.toLocaleString()} 口`;
                            } else if(context.datasetIndex === 1){
                                return `空單: ${context.parsed.y.toLocaleString()} 口`;
                            } else {
                                return `加權指數: ${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '口數'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '加權指數'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    max: extreme.max,
                    min: extreme.min,
                }
            }
        }
    });
}

// 外資選擇權圖表
function createOptionsChart(data) {
    const ctx = document.getElementById('optionsChart').getContext('2d');
    const extreme = findExtremes(data.map(x => x.indexClose), 0.01, 100);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.date.length > 10 ? d.date.substring(5) : d.date),
            datasets: [{
                label: '外資買權',
                data: data.map(d => d.foreignOpCall),
                backgroundColor: 'rgba(255, 99, 132, 0.7)',
                yAxisID: 'y'
            }, {
                label: '外資賣權',
                data: data.map(d => d.foreignOpPut),
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                yAxisID: 'y'
            }, {
                label: '加權指數',
                type: 'line',
                data: data.map(d => d.indexClose),
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                fill: false,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '外資選擇權'
                },tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `日期: ${data[context[0].dataIndex].date}`;
                        },
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return `CALL: ${context.parsed.y.toLocaleString()} 億`;
                            } else if(context.datasetIndex === 1){
                                return `PUT: ${context.parsed.y.toLocaleString()} 億`;
                            } else {
                                return `加權指數: ${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '億'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '加權指數'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    max: extreme.max,
                    min: extreme.min,
                }
            }
        }
    });
}
