import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, Text, Title, Container, Group, Paper, } from '@mantine/core';
import { LineChart } from '@mantine/charts';
import { Table } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import './App.css';

// Sample bot logic
const arbitrageBot = () => {
  const exchanges = ['Binance', 'Bybit', 'BitGet', 'Mexc'];
  const tokens = ['BTC', 'XRP', 'ETH', 'SOL', 'SONIC', 'ADA'];
  
  // Simulate price checking
  const checkArbitrage = () => {
    const prices = tokens.map(token => ({
      token,
      prices: exchanges.reduce((acc, exchange) => ({
        ...acc,
        [exchange]: (Math.random() * 10000).toFixed(2)
      }), {})
    }));
    return prices;
  };
  
  return { checkArbitrage };
};

// Sample data for charts
const tradeData = [
  { day: '2025-08-01', trades: 120, profit: 1500 },
  { day: '2025-08-02', trades: 180, profit: -200 },
  { day: '2025-08-03', trades: 150, profit: 800 },
  { day: '2025-08-04', trades: 200, profit: 1200 },
];

const App = () => {
  const [priceData, setPriceData] = useState([]);

  useEffect(() => {
    const bot = arbitrageBot();
    setPriceData(bot.checkArbitrage());
  }, []);

  // Calculate average PNL
  const calculateAveragePNL = (days) => {
    const totalProfit = tradeData.slice(-days).reduce((sum, item) => sum + item.profit, 0);
    return (totalProfit / days).toFixed(2);
  };

  // FlashLoan Info
  const flashLoanInfo = {
    totalLoans: 5,
    totalAmount: 1000000, // Example amount in USD
    averageLoan: 200000 // Example average loan amount in USD
  };

  return (
    <MantineProvider>
      <Container py="xl" className="full-width">
        {/* Header */}
        <Group justify="center" mb="xl">
          <div>
            <Title order={1} c="black" style={{ fontSize: '3rem' }}>
              WAGMI
            </Title>
            <Text c="black" size="xl" ta="center">
              Arbitrage Bot
            </Text>
          </div> 
        </Group>
{/* second dashboard */}
          <div className="full-width" backgroundColor="#1a1a1a">
            <Title order={2} mb="md">Dashboard</Title>
            <div className="chart-container">
              <Text fw={500} mb="xs"> Trades vs Profit/Loss</Text>
              <LineChart
                h={300}
                data={tradeData}
                dataKey="day"
                series={[
                  { name: 'trades', label: 'Number of Trades' },
                  { name: 'profit', label: 'Profit/Loss ($)' }
                ]}
                xAxisLabel="Profit/Loss per Day"
                yAxisLabel="Number of Trades"
              />
            </div>
            <div className="chart-container">
              <Text fw={500} mb="xs">Profit/Loss Over Time</Text>
              <LineChart
                h={300}
                data={tradeData}
                dataKey="day"
                series={[{ name: 'profit', label: 'Profit/Loss ($)' }]}
                xAxisLabel="Day and Time"
                yAxisLabel="Profit/Loss"
              />
            </div>
          </div>
        {/* Dashboard */}
        <Paper shadow="sm" p="md" withBorder mb="xl" className="full-width">
          

          {/* Average PNL */}
          <Title order={3} mb="sm">Average PNL</Title>
          <Group mb="xl" align="center" justify="space-around">
            <Text>7 days: ${calculateAveragePNL(7)}</Text>
            <Text>30 days: ${calculateAveragePNL(4)}</Text>
            <Text>90 days: ${calculateAveragePNL(4)}</Text>
            <Text>365 days: ${calculateAveragePNL(4)}</Text>
          </Group>

          {/* Flash Loan Info */}
          <Text fw={500} mb="xs">Total FlashLoan Taken</Text>
          <Text>Total Loans: 5 </Text>
          <Text>Total Amount: $1,000,000 </Text>
          <Text>Average Loan: $200,000 </Text>

          {/* Interactive Table */}
          <Title order={3} mb="sm">Token Price Comparison</Title>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Token</Table.Th>
                <Table.Th>Binance</Table.Th>
                <Table.Th>Bybit</Table.Th>
                <Table.Th>BitGet</Table.Th>
                <Table.Th>Mexc</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {priceData.map((row) => (
                <Table.Tr key={row.token}>
                  <Table.Td>{row.token}</Table.Td>
                  <Table.Td>${row.prices.Binance}</Table.Td>
                  <Table.Td>${row.prices.Bybit}</Table.Td>
                  <Table.Td>${row.prices.BitGet}</Table.Td>
                  <Table.Td>${row.prices.Mexc}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
        </Container>
    </MantineProvider>
  );
};

export default App;