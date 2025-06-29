# Palestinian Casualties Daily Counter

A modern, responsive web application that displays daily casualty counts from Gaza and West Bank, sourced from the Palestine Datasets API. Features interactive date selection, historical data viewing, and comprehensive statistics visualization.

## Features

- **Interactive Date Selection**: Click dates to view historical data with smart fallbacks
- **Dual Region Support**: Toggle between Gaza and West Bank data
- **Data Visualization**: Charts showing daily/cumulative statistics and 30-day trends
- **Mobile Optimized**: Touch-friendly interface with pull-to-refresh
- **Real-time Updates**: Auto-refresh every 30 minutes
- **Demographic Breakdown**: Children, women, medical personnel, journalists
- **Offline Support**: Cached data available when offline

## Project Structure

```
Palestinian Casualties Daily Counter/
├── index.html          # Main HTML with date picker modal
├── styles.css          # Responsive CSS with modern UI
├── server.py           # Development server with CORS proxy
├── app.js             # Main application logic
├── config.js          # Configuration management
├── api.js             # API client with caching
├── ui.js              # UI components and interactions
├── chart.js           # Chart.js integration
├── utils.js           # Shared utilities
└── README.md          # Documentation
```

## Quick Start

### Local Development

1. **Clone and navigate to directory**:
   ```bash
   git clone <your-repo-url>
   cd "Palestinian Casualties Daily Counter"
   ```

2. **Start development server**:
   ```bash
   python3 server.py
   ```

3. **Open browser** to `http://localhost:8000`

### Requirements
- Python 3.6+ (for development server)
- Modern web browser with ES6 support
- Internet connection for API data

## Deployment

### GitHub Pages
1. Push to GitHub repository
2. Enable Pages in Settings → Pages
3. Deploy from main branch

### Static Hosting (Netlify/Vercel)
- Deploy all files except `server.py`
- Automatic CORS handling

### Server Deployment
- Upload all files including `server.py`
- Run Python server for enhanced features

## Usage

1. **Current Data**: App loads with latest available casualties
2. **Switch Regions**: Click Gaza/West Bank tabs
3. **Historical Data**: Click date to open picker
4. **Quick Access**: Use recent day buttons
5. **Charts**: View 30-day trends below main data

## Data Sources

- **Gaza**: Ministry of Health, Government Media Office
- **West Bank**: UN OCHA
- **API**: [Tech For Palestine](https://data.techforpalestine.org/)
- **Coverage**: October 7, 2023 - Present

### Limitations
- Direct casualties only (excludes indirect effects)
- Daily updates depend on official reports
- Some dates show closest available data

## Browser Support

- **Desktop**: Chrome 61+, Firefox 60+, Safari 10.1+, Edge 16+
- **Mobile**: iOS Safari 10.3+, Chrome Mobile 61+
- **Requirements**: JavaScript, ES6 modules, local storage

## Privacy

- No tracking or analytics
- Local storage only for caching
- No personal data collection
- HTTPS API connections

## Development

### Architecture
- **ES6 Modules**: Clean modular structure
- **Error Handling**: Comprehensive error boundaries
- **Performance**: Optimized for mobile and slow connections
- **Caching**: Smart cache with stale-while-revalidate

### Adding Features
1. UI Components → `ui.js`
2. Data Processing → `api.js`
3. Visualizations → `chart.js`
4. Configuration → `config.js`

## Contributing

1. Maintain modular architecture
2. Add comprehensive error handling
3. Test on mobile devices
4. Ensure accessibility
5. Handle casualty data respectfully

## License

MIT License - Educational and informational purposes.

Data provided by [Tech For Palestine](https://data.techforpalestine.org/).

---

**Built with respect for those we remember** 🕊️
