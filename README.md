# Palestinian Casualties Daily Counter

A modern, responsive web application that displays daily casualty counts from Gaza and West Bank, sourced from the Palestine Datasets API. Features an interactive date picker for historical data viewing and comprehensive daily/cumulative statistics visualization.

## ✨ Key Features

### 🗓️ Interactive Date Selection
- **Clickable Date Display**: Click on any displayed date to open the date picker
- **Date Picker Modal**: Beautiful, modern modal with glassmorphism design
- **Quick Date Buttons**: Access last 7 days with one click (Today, Yesterday, etc.)
- **Historical Data Loading**: View casualties data for any date since October 7, 2023
- **Smart Fallbacks**: Automatically shows closest available date when exact date isn't available
- **Date Notifications**: Helpful notifications when using fallback dates

### 📊 Data Visualization
- **Real-time Data**: Latest casualty counts from Palestine Datasets API
- **Dual Region Support**: Toggle between Gaza and West Bank with smooth transitions
- **Daily & Cumulative Stats**: Both daily changes and total casualties
- **Interactive Charts**: Last 30 days visualization with Chart.js, adapts to selected date
- **Demographic Breakdown**: Children, women, medical personnel, and journalists
- **Settler Violence Tracking**: West Bank-specific settler attack data

### 🎨 Enhanced User Experience
- **Modern UI Design**: Clean, professional interface with smooth animations
- **Mobile-First**: Optimized for touch devices with proper button sizing
- **Pull-to-Refresh**: Mobile-friendly refresh functionality
- **Auto-Refresh**: Updates every 30 minutes and on tab focus
- **Loading States**: Smooth transitions with skeleton loading
- **Comprehensive Error Handling**: User-friendly error messages with retry options

### ⚡ Technical Excellence
- **Smart Caching**: Intelligent cache with stale-while-revalidate strategy
- **Request Deduplication**: Prevents duplicate API calls
- **Modular Architecture**: Clean ES6 modules with single responsibilities
- **Timezone Safe**: Robust date parsing avoiding timezone conversion issues
- **Performance Optimized**: Minimal DOM manipulation and efficient updates

## 🏗️ Project Structure

```
Death Counter/
├── index.html          # Main HTML with date picker modal
├── styles.css          # Responsive CSS with modern UI components
├── server.py           # Development server with CORS proxy
├── app.js             # Main application with date selection logic
├── config.js          # Centralized configuration
├── api.js             # Enhanced API client with historical data support
├── ui.js              # UI manager with date picker functionality
├── chart.js           # Advanced Chart.js integration with date filtering
├── utils.js           # Shared utility functions
└── README.md          # This documentation
```

### Module Architecture

| Module | Purpose | Recent Enhancements |
|--------|---------|---------------------|
| **`app.js`** | Application orchestration | Date selection events, historical data loading |
| **`config.js`** | Configuration management | API URLs, cache settings, UI constants |
| **`api.js`** | Data fetching | Closest date fallback, enhanced error handling |
| **`ui.js`** | User interface | Date picker modal, notification system |
| **`chart.js`** | Data visualization | Historical chart filtering, timezone fixes |
| **`utils.js`** | Shared utilities | Date formatting, validation, DOM helpers |
| **`server.py`** | Development server | CORS proxy, static file serving |

## 🚀 Quick Start

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/kunehenry/Palestinian-Casualties.git
   cd Palestinian-Casualties
   ```

2. **Start the development server**:
   ```bash
   python3 server.py
   ```

3. **Open your browser** to `http://localhost:8000`

### Alternative Port
```bash
python3 server.py 8080  # Use port 8080 if 8000 is busy
```

### Requirements
- **Python 3.6+** (for development server)
- **Modern web browser** with ES6 module support
- **Internet connection** (for API data and Chart.js CDN)

## 🌐 Deployment Options

### GitHub Pages (Recommended)
1. Push repository to GitHub
2. Go to Settings → Pages
3. Deploy from main branch
4. Auto-detection handles CORS proxy setup

### Static Hosting (Netlify, Vercel)
- Deploy all files except `server.py`
- Automatic environment detection
- Direct API endpoint usage

### Server Deployment
- Upload all files including `server.py`
- Run Python server for enhanced caching and CORS handling

## ⚙️ Configuration

The app automatically detects deployment environment and configures appropriate API endpoints:

```javascript
// Automatic environment detection
- GitHub Pages: *.github.io domains → CORS proxy
- Netlify/Vercel: *.netlify.app, *.vercel.app → Direct API
- Local/Server: localhost or custom domains → Proxy endpoints
```

## 🎯 Usage Guide

### Basic Navigation
1. **View Current Data**: App loads with today's casualties (or latest available)
2. **Switch Regions**: Click Gaza/West Bank tabs for different data
3. **Historical Viewing**: Click on the date to open date picker
4. **Quick Dates**: Use quick buttons for recent days
5. **Charts**: Scroll down to see 30-day trend visualization

### Date Picker Features
- **Date Input**: Manual date selection with calendar picker
- **Quick Buttons**: Last 7 days for easy access
- **Smart Validation**: Prevents selection of unavailable dates
- **Fallback Handling**: Shows closest available date when needed

### Mobile Experience
- **Touch Optimized**: Large touch targets and smooth gestures
- **Pull-to-Refresh**: Native mobile refresh support
- **Responsive Design**: Adapts to all screen sizes
- **Offline Resilience**: Cached data available when offline

## 📊 Data Information

### Sources
- **Gaza**: Ministry of Health, Government Media Office
- **West Bank**: UN OCHA (Office for the Coordination of Humanitarian Affairs)
- **API Provider**: [Tech For Palestine](https://data.techforpalestine.org/)

### Coverage
- **Period**: October 7, 2023 - Present
- **Update Frequency**: Daily (when reports available)
- **Data Types**: Casualties, demographics, medical personnel, journalists, settler attacks

### Limitations
- Numbers represent **direct casualties only**
- Does **not include indirect casualties** (malnutrition, lack of medical care)
- Some dates may show **closest available data** when exact date unavailable
- Daily updates depend on official report availability

## 🛠️ Development

### Architecture Principles
- **ES6 Modules**: Modern JavaScript with clean imports/exports
- **Single Responsibility**: Each module has one clear purpose
- **Error Boundaries**: Comprehensive error handling throughout
- **Performance First**: Optimized for mobile and slow connections

### Recent Technical Improvements
- **Timezone Safety**: Fixed date parsing issues across timezones
- **Enhanced Caching**: Better handling of historical data
- **Event System**: Custom events for component communication
- **Memory Management**: Proper cleanup of DOM elements and timers

### Adding Features
1. **UI Components**: Extend `ui.js` with new interface elements
2. **Data Processing**: Modify `api.js` for new data sources
3. **Visualizations**: Enhance `chart.js` for new chart types
4. **Configuration**: Update `config.js` for new settings

## 🌐 Browser Support

### Desktop
- **Chrome/Chromium**: 61+
- **Firefox**: 60+
- **Safari**: 10.1+
- **Edge**: 16+

### Mobile
- **iOS Safari**: 10.3+
- **Chrome Mobile**: 61+
- **Samsung Internet**: 8.0+

### Requirements
- JavaScript enabled
- ES6 modules support
- Local storage for caching

## 🔒 Privacy & Security

### Data Practices
- **No Tracking**: Zero analytics or user tracking
- **Local Storage Only**: Cache data stored locally
- **No Personal Data**: Application collects no user information
- **Secure Connections**: HTTPS API calls

### Cache Management
- **Automatic Expiry**: Cache cleaned up automatically
- **Storage Efficient**: Graceful handling of storage limits
- **Privacy Mode**: Works in incognito/private browsing

## 🤝 Contributing

### Development Guidelines
1. **Maintain Architecture**: Keep modular structure intact
2. **Error Handling**: Add comprehensive error boundaries
3. **Mobile First**: Test on mobile devices
4. **Accessibility**: Ensure keyboard navigation and screen reader support
5. **Sensitive Data**: Respectful presentation of casualty information

### Code Standards
- **Modern JavaScript**: ES6+ features preferred
- **Clear Documentation**: Comment complex logic
- **Consistent Style**: Follow existing patterns
- **Cross-Browser Testing**: Verify compatibility

## 📄 License

MIT License - Educational and informational purposes.

Data provided by [Tech For Palestine](https://data.techforpalestine.org/).

---

**Built with respect for those we remember** 🕊️
