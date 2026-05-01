import React from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const chartBaseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#264653'
      }
    }
  }
};

const ReportsCharts = ({ statusCounts }) => {
  const barData = {
    labels: ['Pending', 'In Progress', 'Resolved'],
    datasets: [
      {
        label: 'Reports',
        data: [statusCounts.pending, statusCounts.inProgress, statusCounts.resolved],
        backgroundColor: ['#FFB74D', '#42A5F5', '#66BB6A'],
        borderRadius: 10
      }
    ]
  };

  const pieData = {
    labels: ['Pending', 'In Progress', 'Resolved'],
    datasets: [
      {
        data: [statusCounts.pending, statusCounts.inProgress, statusCounts.resolved],
        backgroundColor: ['#FFB74D', '#42A5F5', '#66BB6A'],
        borderWidth: 0
      }
    ]
  };

  return (
    <div className="charts-grid">
      <div className="card chart-card">
        <h3>Report Status Overview</h3>
        <div className="chart-panel">
          <Bar data={barData} options={{ ...chartBaseOptions }} />
        </div>
      </div>

      <div className="card chart-card">
        <h3>Case Distribution</h3>
        <div className="chart-panel chart-panel--pie">
          <Pie data={pieData} options={{ ...chartBaseOptions }} />
        </div>
      </div>
    </div>
  );
};

export default ReportsCharts;
