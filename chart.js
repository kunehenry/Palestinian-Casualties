import { CONFIG } from './config.js';

class ChartManager {
    constructor() {
        this.chart = null;
        this.canvas = null;
    }

    // Initialize chart with canvas element
    initialize(canvasElement) {
        this.canvas = canvasElement;
        if (!this.canvas) {
            console.warn('Chart canvas element not found');
            return false;
        }
        return true;
    }

    // Create or update chart with new data
    createChart(data, region) {
        if (!this.canvas || !data || data.length === 0) {
            console.warn('Cannot create chart: missing canvas or data');
            return;
        }

        // Destroy existing chart if it exists
        this.destroyExistingChart();

        try {
            // Prepare data for the last 30 days
            const chartData = this.prepareChartData(data, region);

            if (chartData.labels.length === 0) {
                console.warn('No data available for chart');
                return;
            }

            // Create new chart
            this.chart = new Chart(this.canvas, {
                type: 'line',
                data: chartData,
                options: this.getChartOptions(region)
            });
        } catch (error) {
            console.error('Error creating chart:', error);
            this.showChartError();
        }
    }

    // Destroy existing chart instance
    destroyExistingChart() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    // Prepare chart data from API response
    prepareChartData(data, region) {
        // Sort data by date first, then take last 30 days
        const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
        const last30Days = sortedData.slice(-CONFIG.UI.chartMaxPoints);

        const chartData = {
            labels: [],
            datasets: this.createDatasets()
        };

        last30Days.forEach((item, index) => {
            if (!item.date) return;

            // Format date for display
            const date = new Date(item.date);
            const label = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
            chartData.labels.push(label);

            // Calculate daily casualties (difference from previous day)
            const dailyData = this.calculateDailyCasualties(item, last30Days[index - 1]);

            chartData.datasets[0].data.push(dailyData.killed);
            chartData.datasets[1].data.push(dailyData.injured);
        });

        return chartData;
    }

    // Calculate daily casualties from cumulative data
    calculateDailyCasualties(current, previous) {
        const killed = parseInt(current.killed) || 0;
        const injured = parseInt(current.injured) || 0;

        if (!previous) {
            // First day - use raw numbers or assume 0 daily
            return { killed: 0, injured: 0 };
        }

        const prevKilled = parseInt(previous.killed) || 0;
        const prevInjured = parseInt(previous.injured) || 0;

        return {
            killed: Math.max(0, killed - prevKilled),
            injured: Math.max(0, injured - prevInjured)
        };
    }

    // Create chart datasets configuration
    createDatasets() {
        return [
            {
                label: 'Deaths per Day',
                data: [],
                borderColor: '#ff6b6b',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            },
            {
                label: 'Injuries per Day',
                data: [],
                borderColor: '#ffa726',
                backgroundColor: 'rgba(255, 167, 38, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }
        ];
    }

    // Get chart configuration options
    getChartOptions(region) {
        const regionName = CONFIG.REGIONS[region]?.name || region;

        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: this.getPluginOptions(regionName),
            scales: this.getScaleOptions()
        };
    }

    // Get plugin configuration options
    getPluginOptions(regionName) {
        return {
            title: {
                display: true,
                                    text: `Daily Afflictions - ${regionName} (Last 30 Days)`,
                color: '#ffffff',
                font: {
                    size: 16,
                    weight: 'bold'
                },
                padding: 20
            },
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: '#e0e6ed',
                    usePointStyle: true,
                    padding: 20,
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(26, 26, 46, 0.95)',
                titleColor: '#ffffff',
                bodyColor: '#e0e6ed',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                cornerRadius: 8,
                displayColors: true,
                callbacks: {
                    title: function(context) {
                        return `Date: ${context[0].label}`;
                    },
                    label: function(context) {
                        const value = context.parsed.y;
                        return `${context.dataset.label}: ${value.toLocaleString()}`;
                    }
                }
            }
        };
    }

    // Get scale configuration options
    getScaleOptions() {
        return {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Date',
                    color: '#a0a6b8',
                    font: {
                        size: 12,
                        weight: 'bold'
                    }
                },
                ticks: {
                    color: '#a0a6b8',
                    maxTicksLimit: 10,
                    font: {
                        size: 11
                    }
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                    drawBorder: false
                }
            },
            y: {
                display: true,
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Daily Count',
                    color: '#a0a6b8',
                    font: {
                        size: 12,
                        weight: 'bold'
                    }
                },
                ticks: {
                    color: '#a0a6b8',
                    font: {
                        size: 11
                    },
                    callback: function(value) {
                        return value.toLocaleString();
                    }
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                    drawBorder: false
                }
            }
        };
    }

    // Show chart error message
    showChartError() {
        if (!this.canvas || !this.canvas.parentElement) return;

        const errorElement = document.createElement('div');
        errorElement.className = 'chart-error';
        errorElement.innerHTML = `
            <p>Unable to load chart data</p>
            <small>Chart functionality requires Chart.js library</small>
        `;

        // Replace canvas with error message
        this.canvas.parentElement.appendChild(errorElement);
        this.canvas.style.display = 'none';
    }

    // Update existing chart with new data
    updateChart(data, region) {
        if (!ChartManager.isChartJSAvailable()) {
            console.warn('Chart.js not available');
            return;
        }

        // Create new chart if none exists
        if (!this.chart) {
            this.createChart(data, region);
            return;
        }

        try {
            // Update chart data
            const chartData = this.prepareChartData(data, region);

            this.chart.data.labels = chartData.labels;
            this.chart.data.datasets[0].data = chartData.datasets[0].data;
            this.chart.data.datasets[1].data = chartData.datasets[1].data;

            // Update chart title
            const regionName = CONFIG.REGIONS[region]?.name || region;
            this.chart.options.plugins.title.text = `Daily Afflictions - ${regionName} (Last 30 Days)`;

            this.chart.update();
        } catch (error) {
            console.error('Error updating chart:', error);
            // Fallback to creating new chart
            this.createChart(data, region);
        }
    }

    // Cleanup and destroy chart
    destroy() {
        this.destroyExistingChart();
        this.canvas = null;
    }

    // Check if Chart.js is available
    static isChartJSAvailable() {
        return typeof Chart !== 'undefined';
    }
}

export default new ChartManager();
