const talib = require("talib");

function calculateIndicators(prices, highs, lows) {
  const closePrices = prices.slice(-60); // Last 60 periods
  const highPrices = highs.slice(-60);
  const lowPrices = lows.slice(-60);

  // RSI (14 periods)
  const rsi = talib.execute({
    name: "RSI",
    startIdx: 0,
    endIdx: closePrices.length - 1,
    inReal: closePrices,
    optInTimePeriod: 14,
  }).result.outReal;

  // StochRSI
  const stochRSI = talib.execute({
    name: "STOCHRSI",
    startIdx: 0,
    endIdx: closePrices.length - 1,
    inReal: closePrices,
    optInTimePeriod: 14,
    optInFastK_Period: 14,
    optInFastD_Period: 3,
    optInFastD_MAType: 0,
  });

  // Moving Averages (7, 14, 21, 51 days)
  const ma7 = talib.execute({
    name: "SMA",
    startIdx: 0,
    endIdx: closePrices.length - 1,
    inReal: closePrices,
    optInTimePeriod: 7,
  }).result.outReal;

  const ma14 = talib.execute({
    name: "SMA",
    startIdx: 0,
    endIdx: closePrices.length - 1,
    inReal: closePrices,
    optInTimePeriod: 14,
  }).result.outReal;

  const ma21 = talib.execute({
    name: "SMA",
    startIdx: 0,
    endIdx: closePrices.length - 1,
    inReal: closePrices,
    optInTimePeriod: 21,
  }).result.outReal;

  const ma51 = talib.execute({
    name: "SMA",
    startIdx: 0,
    endIdx: closePrices.length - 1,
    inReal: closePrices,
    optInTimePeriod: 51,
  }).result.outReal;

  // KDJ
  const kdj = talib.execute({
    name: "STOCH",
    startIdx: 0,
    endIdx: closePrices.length - 1,
    inHigh: highPrices,
    inLow: lowPrices,
    inClose: closePrices,
    optInFastK_Period: 9,
    optInSlowK_Period: 3,
    optInSlowD_Period: 3,
  });

  return {
    rsi: rsi[rsi.length - 1],
    stochRSI: {
      fastK: stochRSI.result.outFastK[stochRSI.result.outFastK.length - 1],
      fastD: stochRSI.result.outFastD[stochRSI.result.outFastD.length - 1],
    },
    ma7: ma7[ma7.length - 1],
    ma14: ma14[ma14.length - 1],
    ma21: ma21[ma21.length - 1],
    ma51: ma51[ma51.length - 1],
    kdj: {
      k: kdj.result.outSlowK[kdj.result.outSlowK.length - 1],
      d: kdj.result.outSlowD[kdj.result.outSlowD.length - 1],
    },
  };
}

function shouldTrade(indicators) {
  // Trading logic
  const { rsi, stochRSI, ma7, ma14, ma21, ma51, kdj } = indicators;
  const isBullish = rsi < 70 && rsi > 30 && // Not overbought/oversold
                    stochRSI.fastK > stochRSI.fastD && // StochRSI bullish crossover
                    ma7 > ma14 && ma14 > ma21 && ma21 > ma51 && // Bullish MA alignment
                    kdj.k > kdj.d && kdj.k < 80; // KDJ bullish and not overbought

  const isBearish = rsi > 70 && // Overbought
                    stochRSI.fastK < stochRSI.fastD && // StochRSI bearish crossover
                    ma7 < ma14 && ma14 < ma21 && ma21 < ma51 && // Bearish MA alignment
                    kdj.k < kdj.d && kdj.k > 20; // KDJ bearish and not oversold

  return {
    shouldBuy: isBullish,
    shouldSell: isBearish,
  };
}

module.exports = { calculateIndicators, shouldTrade };