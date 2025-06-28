# Palestinian Casualties Daily Counter

A modern, responsive web application that displays daily casualty counts from Gaza and West Bank, sourced from the Palestine Datasets API. Built with clean, modular ES6 JavaScript and featuring a comprehensive development server.

## ✨ Features

### Core Functionality
- **Real-time data**: Fetches latest casualty data from Palestine Datasets API
- **Dual region support**: Toggle between Gaza and West Bank with smooth transitions
- **Daily & cumulative statistics**: Shows both daily changes and total casualties
- **Interactive charts**: Displays the last 30 days of casualties using Chart.js
- **Demographic breakdown**: Children, women, medical personnel, and journalists
- **Settler violence tracking**: West Bank-specific settler attack data

### User Experience
- **Hero section**: Full-screen daily casualties display
- **Pull-to-refresh**: Mobile-friendly refresh functionality
- **Auto-refresh**: Updates every 30 minutes and on tab focus
- **Responsive design**: Optimized for desktop, tablet, and mobile
- **Loading states**: Smooth transitions with skeleton loading
- **Error handling**: User-friendly error messages with retry options

### Technical Features
- **Smart caching**: Intelligent cache with stale-while-revalidate strategy
- **Request deduplication**: Prevents duplicate API calls
- **Modular architecture**: Clean ES6 modules with single responsibilities
- **Type safety**: Better error detection and debugging
- **Performance optimized**: Minimal DOM manipulation and efficient updates

## 🏗️ Project Structure

```
Death Counter/
├── index.html          # Main HTML entry point
├── styles.css          # Responsive CSS styling
├── server.py           # Development server with CORS proxy
├── app.js             # Main application orchestration
├── config.js          # Centralized configuration
├── api.js             # API client with caching and error handling
├── ui.js              # UI state management
├── chart.js           # Chart.js integration and data visualization
├── utils.js           # Shared utility functions
└── README.md          # Project documentation
```

### Module Architecture

| Module | Purpose | Key Features |
|--------|---------|--------------|
| **`app.js`** | Application orchestration | Event handling, initialization, lifecycle management |
| **`config.js`** | Configuration management | API URLs, cache settings, UI constants |
| **`api.js`** | Data fetching | Request deduplication, smart caching, error recovery |
| **`ui.js`** | User interface | DOM manipulation, loading states, responsive updates |
| **`chart.js`** | Data visualization | Chart.js integration, responsive charts |
| **`utils.js`** | Shared utilities | Data formatting, validation, DOM helpers |
| **`server.py`** | Development server | CORS proxy, static file serving, API routing |

## 🚀 Installation & Setup

### Quick Start (Local Development)

1. **Clone or download** the project files
2. **Start the development server**:
   ```bash
   python3 server.py
   ```
3. **Open your browser** to `http://localhost:8000`

### Alternative Port
```bash
# If port 8000 is in use
python3 -c "
import sys; sys.path.append('.');
from server import run_server;
run_server(8080)
"
```

### Requirements
- **Python 3.6+** (for development server)
- **Modern web browser** with ES6 module support
- **Internet connection** (for API data and Chart.js CDN)

### Production Deployment

#### GitHub Pages (Recommended for Static Hosting)
1. Push your repository to GitHub
2. Go to repository Settings → Pages
3. Set source to "Deploy from a branch" and select your main branch
4. Your site will be available at `https://username.github.io/repository-name`

**Note**: The app automatically detects GitHub Pages and uses direct API endpoints.

#### Other Static Hosting (Netlify, Vercel)
1. Deploy all files except `server.py`
2. The app automatically detects static hosting and uses direct API endpoints
3. No configuration changes needed

#### Web Server with Python Proxy (Development & Production)
1. Upload all files to your web directory
2. Run `python3 server.py` to start the proxy server
3. The app automatically detects server environments and uses proxy endpoints
4. Benefits: Server-side caching, CORS handling, request optimization

## ⚙️ Configuration

All settings are centralized in `config.js` with automatic environment detection:

### Environment Detection

The app automatically detects the deployment environment and selects appropriate API endpoints:

- **Static Hosting** (GitHub Pages, Netlify, Vercel): Uses direct API calls to Tech for Palestine
- **Server Environment** (localhost, custom domains with server.py): Uses proxy endpoints

**Detection Logic:**
- GitHub Pages: `*.github.io` or `*.github.com` domains
- Netlify: `*.netlify.app` or `*.netlify.com` domains
- Vercel: `*.vercel.app` or `*.vercel.com` domains
- Local files: `file://` protocol
- Other static hosts: Non-localhost domains without server detection

**Debug Environment Detection:**
To verify which environment is detected, add `?debug=env` to your URL or run `debugEnvironment()` in the browser console.

```javascript
export const CONFIG = {
    // API endpoints - automatically selected based on environment
    // Static hosting (GitHub Pages, Netlify, Vercel): Direct API calls
    // Server environments (localhost, custom domains): Proxy endpoints
    API_URLS: getAPIUrls(),

    // Cache configuration
    CACHE: {
        expiry: 5 * 60 * 1000,      // 5 minutes fresh
        maxAge: 30 * 60 * 1000,     // 30 minutes stale
        key: 'palestine_casualties_cache'
    },

    // Auto-refresh settings
    REFRESH: {
        interval: 30 * 60 * 1000,   // 30 minutes
        retryDelay: 5 * 60 * 1000,  // 5 minutes on error
        maxRetries: 3
    },

    // UI configuration
    UI: {
        loadingMinTime: 1000,       // Prevent loading flicker
        errorDisplayTime: 10000,    // Error message duration
        chartMaxPoints: 30          // Chart data points
    }
};
```

## 📊 Data Sources & API

### Primary Sources
- **Gaza**: Ministry of Health, Government Media Office
- **West Bank**: UN OCHA (Office for the Coordination of Humanitarian Affairs)
- **API Provider**: [Tech For Palestine](https://data.techforpalestine.org/)

### API Endpoints
- **Gaza Daily**: `https://data.techforpalestine.org/api/v2/casualties_daily.json`
- **West Bank Daily**: `https://data.techforpalestine.org/api/v2/west_bank_daily.json`

### Data Coverage
- **Time Period**: October 7, 2023 - Present
- **Update Frequency**: Daily when reports are available
- **Data Types**: Killed, injured, demographics, professionals, settler attacks

## 🛠️ Development

### Code Style
- **ES6 Modules**: Modern JavaScript with import/export
- **Async/Await**: Clean asynchronous code patterns
- **Error Boundaries**: Comprehensive error handling
- **Single Responsibility**: Each module has a clear purpose

### Development Server Features
- **CORS Proxy**: Handles cross-origin API requests
- **Static Serving**: Serves all project files
- **Auto-refresh**: Supports hot reloading during development
- **Error Logging**: Detailed error messages in console

### Making Changes

1. **Start the development server**:
   ```bash
   python3 server.py
   ```

2. **Edit files** and refresh browser to see changes

3. **Test across devices** using responsive design tools

4. **Validate changes** with browser developer tools

### Adding Features

- **New UI components**: Add to `ui.js` and update `app.js`
- **API modifications**: Update `api.js` and `config.js`
- **Chart enhancements**: Modify `chart.js`
- **Utility functions**: Add to `utils.js`

## 🌐 Browser Compatibility

### Supported Browsers
- **Chrome/Chromium**: 61+ (full support)
- **Firefox**: 60+ (full support)
- **Safari**: 10.1+ (full support)
- **Edge**: 16+ (full support)

### Mobile Browsers
- **iOS Safari**: 10.3+
- **Chrome Mobile**: 61+
- **Samsung Internet**: 8.0+

### Requirements
- **JavaScript**: Must be enabled
- **ES6 Modules**: For modern functionality
- **Fetch API**: For network requests
- **LocalStorage**: For caching

## 📱 Mobile Optimization

### Touch Features
- **Pull-to-refresh**: Native mobile refresh gesture
- **Touch-optimized**: Proper touch targets and interactions
- **Swipe gestures**: Smooth scrolling and navigation

### Responsive Design
- **Fluid typography**: Text scales with screen size
- **Flexible layouts**: Adapts to any screen width
- **Touch-friendly**: Buttons and interactive elements sized appropriately
- **Performance**: Optimized for mobile network conditions

## 🔒 Privacy & Security

### Data Handling
- **No tracking**: No analytics or user tracking
- **Local storage**: Only for caching API responses
- **No personal data**: Application doesn't collect user information
- **HTTPS**: Secure API connections

### Cache Management
- **Automatic cleanup**: Expired cache removal
- **Storage limits**: Graceful handling of storage quotas
- **Privacy mode**: Works in private/incognito browsing

## 🚨 Important Notes

### Data Limitations
- Numbers represent **direct casualties only**
- Does **not include indirect casualties** (malnutrition, lack of medical care)
- Some fields may show **"-"** when data unavailable
- **Daily updates** depend on report availability

### Technical Considerations
- **Internet required**: For initial data loading
- **Modern browser**: Recommended for best experience
- **JavaScript**: Required for functionality
- **CORS**: Development server handles cross-origin requests

## 🤝 Contributing

### Guidelines
1. **Maintain module structure**: Keep single responsibility principle
2. **Error handling**: Add comprehensive error boundaries
3. **Performance**: Optimize for mobile and slow connections
4. **Accessibility**: Ensure keyboard navigation and screen reader support
5. **Respectful presentation**: Appropriate for sensitive data

### Code Standards
- **ES6+**: Use modern JavaScript features
- **Documentation**: Comment complex functions
- **Consistency**: Follow existing code patterns
- **Testing**: Verify across multiple browsers

## 📄 License

This project is for educational and informational purposes. Data provided by [Tech For Palestine](https://data.techforpalestine.org/).

---

**Built with respect for those we remember** 🕊️
