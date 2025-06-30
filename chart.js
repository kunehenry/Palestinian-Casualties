import { CONFIG } from './config.js';

class ChartManager {
    constructor() {
        this.chart = null;
        this.canvas = null;
        this.resizeHandler = null;
        this.setupResizeHandler();
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

    // Check if device is mobile
    isMobile() {
        return window.innerWidth <= 768;
    }

    // Set up mobile chart wrapper
    setupMobileWrapper() {
        const wrapper = this.canvas?.parentElement;
        const container = wrapper?.parentElement;

        if (!wrapper || !wrapper.classList.contains('chart-wrapper')) return;
        if (!container || !container.classList.contains('chart-container')) return;

        if (this.isMobile()) {
            // Configure container for horizontal scrolling
            container.style.overflowX = 'auto';
            container.style.overflowY = 'hidden';

            // Reset wrapper overflow
            wrapper.style.overflowX = 'visible';
            wrapper.style.overflowY = 'visible';

            // Let CSS media queries handle canvas sizing
            this.canvas.style.width = '';
            this.canvas.style.minWidth = '';
        } else {
            // Reset to desktop behavior
            container.style.overflowX = '';
            container.style.overflowY = '';

            wrapper.style.overflowX = '';
            wrapper.style.overflowY = '';

            this.canvas.style.width = '';
            this.canvas.style.minWidth = '';
        }
    }

    // Create or update chart with new data
    createChart(data, region, selectedDate = null) {
        if (!this.canvas || !data || data.length === 0) {
            console.warn('Cannot create chart: missing canvas or data');
            return;
        }

        // Destroy existing chart if it exists
        this.destroyExistingChart();

        // Set up mobile wrapper if on mobile device
        this.setupMobileWrapper();

        try {
            // Prepare data for the last 30 days
            const chartData = this.prepareChartData(data, region, selectedDate);

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
            // Prepare chart data from API response
    prepareChartData(data, region, selectedDate = null) {
        // Sort data by date first using string comparison (safe for YYYY-MM-DD format)
        const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));

        let filteredData;
        if (selectedDate) {
            // Find the index of the selected date or the closest earlier date using string comparison
            let endIndex = sortedData.findIndex(item => item.date > selectedDate);

            // If no date found after selected date, use the last available date
            if (endIndex === -1) {
                endIndex = sortedData.length;
            }

            // Take the last 30 days up to and including the selected date
            const startIndex = Math.max(0, endIndex - CONFIG.UI.chartMaxPoints);
            filteredData = sortedData.slice(startIndex, endIndex);
                        } else {
            // Show last 30 days up to and including today
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

            // Find all data up to and including today using timezone-safe comparison
            const dataUpToToday = sortedData.filter(item => {
                return item.date <= todayStr; // Direct string comparison works for YYYY-MM-DD format
            });

            // Take the last 30 days from data up to today
            filteredData = dataUpToToday.slice(-CONFIG.UI.chartMaxPoints);
        }

        const chartData = {
            labels: [],
            datasets: this.createDatasets()
        };

                filteredData.forEach((item, index) => {
            if (!item.date) return;

            // Parse date in timezone-safe way to avoid timezone conversion issues
            const [year, month, day] = item.date.split('-').map(Number);
            const date = new Date(year, month - 1, day); // month is 0-based

            const label = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
            chartData.labels.push(label);

            // Calculate daily casualties (difference from previous day)
            const dailyData = this.calculateDailyCasualties(item, filteredData[index - 1]);

            // Store the actual date with the data point for tooltip accuracy
            chartData.datasets[0].data.push({
                x: label,
                y: dailyData.killed,
                date: item.date,
                parsedDate: date // Store the properly parsed date too
            });
            chartData.datasets[1].data.push({
                x: label,
                y: dailyData.injured,
                date: item.date,
                parsedDate: date
            });
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
            devicePixelRatio: window.devicePixelRatio || 1,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            parsing: {
                xAxisKey: 'x',
                yAxisKey: 'y'
            },
            plugins: this.getPluginOptions(regionName),
            scales: this.getScaleOptions()
        };
    }

    // Get plugin configuration options
    getPluginOptions(regionName) {
        return {
                        title: {
                display: false
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
                        // Use the properly parsed date to avoid timezone issues
                        const dataPoint = context[0].raw;
                        if (dataPoint && dataPoint.parsedDate) {
                            return `Date: ${dataPoint.parsedDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}`;
                        }
                        // Fallback to parsing the original date string safely
                        if (dataPoint && dataPoint.date) {
                            const [year, month, day] = dataPoint.date.split('-').map(Number);
                            const date = new Date(year, month - 1, day);
                            return `Date: ${date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}`;
                        }
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
                type: 'category',
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
    updateChart(data, region, selectedDate = null) {
        if (!ChartManager.isChartJSAvailable()) {
            console.warn('Chart.js not available');
            return;
        }

        // Create new chart if none exists
        if (!this.chart) {
            this.createChart(data, region, selectedDate);
            return;
        }

        try {
            // Update chart data
            const chartData = this.prepareChartData(data, region, selectedDate);

            this.chart.data.labels = chartData.labels;
            this.chart.data.datasets[0].data = chartData.datasets[0].data;
            this.chart.data.datasets[1].data = chartData.datasets[1].data;

            this.chart.update();
        } catch (error) {
            console.error('Error updating chart:', error);
            // Fallback to creating new chart
            this.createChart(data, region, selectedDate);
        }
    }

    // Cleanup and destroy chart
    destroy() {
        this.destroyExistingChart();

        // Clean up resize handler
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            window.removeEventListener('orientationchange', this.resizeHandler);
            this.resizeHandler = null;
        }

        this.canvas = null;
    }

    // Check if Chart.js is available
    static isChartJSAvailable() {
        return typeof Chart !== 'undefined';
    }

    // Set up window resize handler for mobile responsiveness
    setupResizeHandler() {
        let resizeTimeout;
        this.resizeHandler = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.chart && this.canvas) {
                    this.setupMobileWrapper();
                    this.chart.resize();
                }
            }, 150);
        };

        window.addEventListener('resize', this.resizeHandler);
        window.addEventListener('orientationchange', this.resizeHandler);
    }
}

export default new ChartManager();
